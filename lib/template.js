'use strict';

const Parser = require('liqd-parser');
const Style = require('liqd-style');
const UglifyJS = require('uglify-js');

function attributes( attributes, defaults = {}, disallowed = [] )
{
	let attribs = {}, attrs = '';

	for( let attribute of attributes )
	{
		if( disallowed.includes( attribute.attribute ) ){ continue; }

		if( attribute.hasOwnProperty( 'expression' ) )
		{
			attribs[attribute.attribute] = '\\""+(' + ( attribute.expression  ) + ')+"\\"';
		}
		else if( attribute.hasOwnProperty( 'value' ) )
		{
			attribs[attribute.attribute] = attribute.value !== undefined ? '\\"' + attribute.value + '\\"': undefined;
		}
	}

	for( let attribute in defaults )
	{
		if( disallowed.includes( attribute ) || attribs.hasOwnProperty(attribute) ){ continue; }

		attrs += ' ' + attribute + ( defaults[attribute] !== undefined ? '=\\"' + defaults[attribute] + '\\"' : '' );
	}

	for( let attribute in attribs )
	{
		if( disallowed.includes( attribute ) ){ continue; }

		attrs += ' ' + attribute + ( attribs[attribute] !== undefined ? '=' + attribs[attribute] : '' );
	}

	return attrs;
}

function scope( attributes, disallowed = [] )
{
	let scope = '{';

	for( let attribute of attributes )
	{
		if( disallowed.includes( attribute.attribute ) ){ continue; }

		if( attribute.hasOwnProperty( 'expression' ) )
		{
			scope += '"' + attribute.attribute + '":' + attribute.expression + ',';
		}
		else if( attribute.hasOwnProperty( 'value' ) )
		{
			scope += '"' + attribute.attribute + '":' + ( attribute.value !== undefined ? '"' + attribute.value + '"': 'undefined' ) + ',';
		}
	}

	return scope.substr(0, Math.max(1, scope.length - 1)) + '}';
}

module.exports = class Template
{
	constructor( options )
	{
		this.parser = new Parser( require('fs').readFileSync( __dirname + '/syntax/template.syntax', 'utf8') );
		this.templates = new Map();
		this.scope = Object.assign( Object.assign({}, this.scope || {}, { _TEMPLATE: this.render.bind( this ) }));
	}

	load( file, force = false )
	{
		if( !this.templates.has( file ) || force )
		{
			let parsed_template = this.parser.parse( require('fs').readFileSync(file) );

			//console.log( JSON.stringify( parsed_template, null, '  ' ) );
			let code = this._compile( parsed_template.block );

			//console.log( code );

			this.templates.set( file, new Function( 'parameters', 'scope', 'with( scope ) with( parameters ){ let _RENDER = ""; ' + code + ' return _RENDER; }' ));
		}

		return this.templates.has( file );
	}

	_compile( block )
	{
		let code = '';

		for( let item of block )
		{
			if( item.tag )
			{
				if( item.tag.block )
				{
					code += '_RENDER += "' + '<' + item.tag.tag + attributes( item.tag.attributes ) + '>";\n';
					if(  item.tag.block.length )
					{
						code += this._compile( item.tag.block );
					}
					code += '_RENDER += "' + '</' + item.tag.tag + '>";\n';
				}
				else
				{
					code += '_RENDER += "' + '<' + item.tag.tag + attributes( item.tag.attributes ) + '/>";\n';
				}
			}
			else if( item.template )
			{
				if( item.template.block )
				{
					code += '_RENDER += "' + '<' + item.template.template + attributes( item.template.attributes ) + '>";\n';
					if(  item.template.block.length )
					{
						code += this._compile( item.template.block );
					}
					code += '_RENDER += "' + '</' + item.template.template + '>";\n';
				}
				else
				{
					code += '_RENDER += _TEMPLATE( "' + item.template.template.toLowerCase().replace(/\./g,'/') + '", ' + scope(item.template.attributes ) + ');\n';
				}
			}
			else if( item.statement )
			{
				if( item.statement.for && item.statement.for.block.length )
				{
					code += 'for( let ' + item.statement.for.item + ' of ' + item.statement.for.iterator + ')\n{\n' + this._compile( item.statement.for.block ) + '}\n';
				}
				else if( item.statement.expression )
				{
					code += '_RENDER += ' + item.statement.expression + ';\n';
				}
			}
			else if( item.text )
			{
				code += '_RENDER += "' + item.text + '";\n';
			}
			else if( item.style )
			{
				code += '_RENDER += "' + '<style' + attributes( item.style.attributes, { type: 'text/css' }, ['instance'] ) + '>'+Style.compile(item.style.source, { minify: true })+'</style>' + '";\n';
			}
			else if( item.script )
			{
				//code += '_RENDER += "' + '<script' + attributes( item.script.attributes, { type: 'text/javascript' }, ['instance'] ) + '>" + '+ '`with(${JSON.stringify('+scope(item.script.attributes, ['type', 'instance'] )+')}){' + item.script.source + '}`' + ' + "</script>' + '";\n';
				code += '_RENDER += "' + '<script' + attributes( item.script.attributes, { type: 'text/javascript' }, ['instance'] ) + '>" + '+ '`with(${JSON.stringify('+scope(item.script.attributes, ['type', 'instance'] )+')}){' + UglifyJS.minify(item.script.source).code + '}`' + ' + "</script>' + '";\n';
			}
		}

		return code;
	}

	render( template, parameters, scope = {} )
	{
		let render = '';

		if( template = this.templates.get( template ) )
		{
			render += template( parameters, this.scope );
		}

		return render;
	}
}
