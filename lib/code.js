const Style = require('liqd-style');

const baseCharCodes = [ 'A'.charCodeAt(0), 'a'.charCodeAt(0), '0'.charCodeAt(0) ];

function hash( str, length )
{
	let crc = 0, i, l = str.length, max_crc = Math.pow( 62, length ) - 1, c, hash = '';

	for( i = 0; i < l; ++i )
	{
		crc = ((( crc * 31 ) - crc ) + str.charCodeAt(i)) % max_crc;
	}

	for( i = 0; i < length; ++i )
	{
		c = crc % 62;
		crc = Math.floor( crc / 62 );

		if( c < 26 ){ hash = String.fromCharCode( baseCharCodes[0] + c ) + hash; }
		else if( c < 52 ){ hash = String.fromCharCode( baseCharCodes[1] + c - 26 ) + hash; }
		else{ hash = String.fromCharCode( baseCharCodes[1] + c - 52 ) + hash; }
	}

    return hash;
}

module.exports = class Code
{
	constructor( path )
	{
		this.path = path;
		this.hash = hash( path, 6 );
		this.source = [];
		this.variable_iterator = 0;
		this.last_print = false;
	}

	_variables( names )
	{
		let iterator = ++this.variable_iterator;

		return names.map( name => '__' + name + '_' + iterator );
	}

	print( expression, stringify = true )
	{
		if( stringify ){ expression = JSON.stringify(expression.toString()) }

		if( this.last_print && stringify )
		{
			let last = this.source.length - 1;
			this.source[last] = this.source[last].substr(0, this.source[last].length - 3) + expression.substr(1)+');';
		}
		else
		{
			this.last_print = stringify;
			this.source.push( '__R.push('+expression+');' )
		}
	}

	require( type, code )
	{
		this.code( '__'+type+'["'+this.hash+hash(code,6)+'"]='+code+';' );
	}

	code( code )
	{
		this.last_print = false;
		this.source.push( code );
	}

	if( _if )
	{
		this.code( 'if('+_if.condition+'){' );
		this.compile_block( _if.block );
		this.code( '}' );

		if( _if.else )
		{
			if( _if.else.if )
			{
				this.code( 'else ' );
				this.if( _if.else.if );
			}
			else
			{
				this.code( 'else{' );
				this.compile_block( _if.else.	block );
				this.code( '}' );
			}
		}
	}

	for( _for )
	{
		let [ key, iterator, iterated ] = this._variables([ 'key', 'iterator', 'iterated' ]); key = _for.key || key;

		this.code( 'let '+iterator+'='+_for.iterator+','+iterated+'='+iterator+';' );
		this.code( 'if(typeof '+iterator+'[Symbol.iterator]!=="function"){'+iterated+'=Object.keys('+iterator+')}'+(_for.key?'else{'+iterated+'='+iterator+'.keys();}':'' ));
		this.code( 'for(let '+key+' of '+iterated+'){let '+_for.item+'=('+iterator+'!=='+iterated+'?'+iterator+'['+key+']:'+key+');' );
		this.compile_block( _for.block );
		this.code( '}' );
	}

	attribute( attribute )
	{
		if( attribute.hasOwnProperty( 'expression' ))
		{
			let [ value ] = this._variables([ 'value' ]);

			this.code( 'let '+value+'=('+attribute.expression+');' );
			this.code( 'if('+value+'!==null){' );
			this.print( ' '+attribute.attribute);
			this.code( 'if(typeof '+value+'!=="object"){' );
			this.print( '=' );
			this.print( value+'?JSON.stringify('+value+'.toString()):"\\"\\""', false );
			this.code( '}}' );
		}
		else{ this.print( ' '+attribute.attribute+(attribute.value?'="'+attribute.value+'"':'')); }
	}

	tag( tag )
	{
		this.print( '<' + tag.tag );

		for( let attribute of tag.attributes )
		{
			this.attribute( attribute );
		}

		if( tag.block )
		{
			this.print( '>' );
			this.compile_block( tag.block );
			this.print( '</' + tag.tag + '>' );
		}
		else{ this.print( '/>' ); }
	}

	template( template )
	{
		let parameters = '{' + template.attributes.reduce(( s, a ) => s += '"'+a.attribute+'":'+(a.hasOwnProperty('expression')?a.expression:JSON.stringify(a.value))+',', '') + '}';

		this.code( '{' );

		if( template.block && template.block.length )
		{
			// TODO async/await pri vnorenej template - tzn prepisat na function a {CONTENT} nahradit za volanie s await
			this.code( 'Object.defineProperty(render_scope,"CONTENT",{configurable:true,async get(){let __R=[];'+this.compile_partial( template.block ).join('')+'return __R.join("")}});');
		}

		this.code( 'let __TR = await __TEMPLATE('+(typeof template.template==='string'?'"'+template.template.toLowerCase().replace(/\./g,'/')+'"':template.template.variable)+','+parameters+',scope,render_scope);__R.push( __TR.render );Object.assign(__CSS,__TR.styles);Object.assign(__JS,__TR.scripts);}' );
	}

	style( style )
	{
		// TODO async if require
		let requires = [];

		for( let attribute of style.attributes )
		{
			if( attribute.attribute === 'require' )
			{
				let root = process.argv[1].replace(/[\/\\][^\/\\]+$/,''), template = this.path.replace(/[\/\\][^\/\\]+$/,'') + '/';

				requires = attribute.value.split(/\s*,\s*/).map( p => require('fs').readFileSync( p.startsWith('/') ? root + p : template + p,'utf8') );
			}
		}

		this.require( 'CSS', JSON.stringify( Style.compile(requires.join('\n')+style.source) ));
	}

	script( script )
	{
		let scope = [], attributes = [], source = '', instance = false;

		for( let attribute of script.attributes )
		{
			if( ['type', 'src', 'async', 'defer'].includes( attribute.attribute )){ attributes.push( attribute ); }
			else if( attribute.attribute === 'instance' ){ instance = true; }
			else{ scope.push(attribute); }
		}

		if( scope.length )
		{
			source += '"with({"';

			for( let i = 0; i < scope.length; ++i )
			{
				if( scope[i].hasOwnProperty( 'expression' ) )
				{
					source += '+'+JSON.stringify((i===0?'':',')+'"'+scope[i].attribute+'":');
					source += '+JSON.stringify('+scope[i].expression+')';
				}
				else{ source += '+'+JSON.stringify((i===0?'':',')+'"'+scope[i].attribute+'":'+JSON.stringify(scope[i].value)); }
			}

			source += '+"}){"+';
		}

		source += JSON.stringify(script.source)+(scope.length?'+"}"':'');

		if( instance )
		{
			this.print( '<script' );

			for( let attribute of attributes )
			{
				this.attribute( attribute );
			}

			this.print( '>' );
			this.print( source, false );
			this.print( '</script>' );
		}
		else
		{
			this.require( 'JS', source );
		}
	}

	compile_block( block )
	{
		for( let item of block )
		{
			if( item.tag ){ this.tag( item.tag ); }
			else if( item.template ){ this.template( item.template ); }
			else if( item.statement )
			{
				if( item.statement.declaration ){ this.code( item.statement.declaration.keyword+' '+item.statement.declaration.variable+'='+item.statement.declaration.value+';' ); }
				else if( item.statement.assignment ){ this.code( item.statement.assignment.variable+'='+item.statement.assignment.value+';' ); }
				else if( item.statement.i18n ){ this.print( '$('+item.statement.i18n.arguments+')', false ); }
				else if( item.statement.if ){ this.if( item.statement.if ); }
				else if( item.statement.for && item.statement.for.block.length ){ this.for( item.statement.for ); }
				else if( item.statement.expression )
				{
					if( item.statement.expression === 'CONTENT' )
					{
						this.print( 'await CONTENT', false );
					}
					else
					{
						this.print( item.statement.expression, false );
					}
				}
			}
			else if( item.text ){ this.print( item.text ); }
			else if( item.style ){ this.style( item.style ); }
			else if( item.script ){ this.script( item.script ); }
		}
	}

	compile_partial( block )
	{
		let original_source = this.source, partial_source;

		this.source = [];
		this.last_print = false;

		this.compile_block( block );
		partial_source = this.source;

		this.source = original_source;
		this.last_print = false;

		return partial_source;
	}

	compile( parsed_template, ...args )
	{
		this.compile_block( parsed_template.block );

		return new Function( ...args, 'return new Promise(async(resolve)=>{'+args.reverse().map(a=>'with('+a+')').join('')+'{let __R=[],__JS={},__CSS={};' + this.source.join('') + 'resolve({render:__R.join(""),scripts:__JS,styles:__CSS })}})' );
	}
}
