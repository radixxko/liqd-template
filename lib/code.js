const Style = require('liqd-style');
const UglifyJS = require('uglify-js');

module.exports = class Code
{
	constructor()
	{
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

	code( code )
	{
		this.last_print = false;
		this.source.push( code );
	}

	if( _if )
	{

	}

	else( _else )
	{

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

		this.print( 'await __TEMPLATE('+(typeof template.template==='string'?'"'+template.template.toLowerCase().replace(/\./g,'/')+'"':template.template.variable)+','+parameters+',scope,render_scope)', false );
	}

	style( style )
	{
		// TODO async if require
		let requires = [];

		for( let attribute of style.attributes )
		{
			if( attribute.attribute === 'require' )
			{
				let root = process.argv[1].replace(/[\/\\][^\/\\]+$/,'');

				requires = attribute.value.split(/\s*,\s*/).map( p => require('fs').readFileSync(root + p,'utf8') );
			}
		}

		this.print( '<style>'+Style.compile(requires.join('\n')+style.source)+'</style>' );
	}

	script( script )
	{
		let scope = [], instance = false;

		this.print( '<script' );

		for( let attribute of script.attributes )
		{
			if( ['type', 'src', 'async', 'defer'].includes( attribute.attribute )){ this.attribute( attribute ); }
			else if( attribute.attribute === 'instance' ){ instance = true; }
			else{ scope.push(attribute); }
		}

		this.print( '>' );

		if( scope.length )
		{
			this.print( 'with({' );

			for( let i = 0; i < scope.length; ++i )
			{
				if( scope[i].hasOwnProperty( 'expression' ) )
				{
					this.print( (i===0?'':',')+'"'+scope[i].attribute+'":' );
					this.print( 'JSON.stringify('+scope[i].expression+')', false );
				}
				else{ this.print( (i===0?'':',')+'"'+scope[i].attribute+'":'+JSON.stringify(scope[i].value) ); }
			}

			this.print( '}){' );
		}

		this.print( script.source+(scope.length?'}':'')+'</script>' );
	}

	compile_block( block )
	{
		for( let item of block )
		{
			if( item.tag ){ this.tag( item.tag ); }
			else if( item.template ){ this.template( item.template ); }
			else if( item.statement )
			{
				if( item.statement.for && item.statement.for.block.length ){ this.for( item.statement.for ); }
				else if( item.statement.expression ){ this.print( item.statement.expression, false ); }
			}
			else if( item.text ){ this.print( item.text ); }
			else if( item.style ){ this.style( item.style ); }
			else if( item.script ){ this.script( item.script ); }
		}
	}

	compile( parsed_template, ...args )
	{
		this.compile_block( parsed_template.block );

		return new Function( ...args, 'return new Promise(async(resolve)=>{'+args.reverse().map(a=>'with('+a+')').join('')+'{let __R = [];' + this.source.join('') + 'resolve(__R.join(""))}})' );
	}
}
