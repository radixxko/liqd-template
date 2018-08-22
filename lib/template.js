'use strict';

const FS = require('liqd-fs');
const Parser = require('liqd-parser');
const Code = require('./code');

/* Options
{
	directory: {String path = PWD}
	directories: [{String path}, ...]
	extension: {String extension = "template"}
	reload: { Boolean reload = true }
}
*/

module.exports = class Template
{
	constructor( options = {} )
	{
		this.options = JSON.parse(JSON.stringify( options ));
		this.parser = new Parser( require('fs').readFileSync( __dirname + '/syntax/template.syntax', 'utf8') );
		this.templates = null;

		this._find_templates( this.options.directories || this.options.directory, this.options.extension );
	}

	_register_template( path, pattern )
	{
		let template = path.match(pattern)[1].toLowerCase(), template_scripts = this.templates.get( template );

		if( !template_scripts ){ this.templates.set( template, template_scripts = [] ); }

		template_scripts.push({ path, name: template, template: undefined });
	}

	_update_template( path, pattern )
	{
		let index, template = path.match(pattern)[1].toLowerCase(), template_scripts = this.templates.get( template );

		if( template_scripts && ( index = template_scripts.findIndex( t => t.path === path ) ) !== -1 )
		{
			this._load( template_scripts[index] );
		}
	}

	_unregister_template( path, pattern )
	{
		let index, template = path.match(pattern)[1].toLowerCase(), template_scripts = this.templates.get( template );

		if( template_scripts && ( index = template_scripts.findIndex( t => t.path === path ) ) !== -1 )
		{
			template_scripts.splice( index, 1 );
		}
	}

	async _find_templates( directories, extension )
	{
		if( !directories ){ directories = process.env.PWD; }
		if( !Array.isArray( directories ) ){ directories = [ directories ]; }
		if( !extension ){ extension = 'template'; }

		let pattern = new RegExp( '\\/([^./]+)\\.'+extension.replace(/[^A-Za-z0-9]/g, c => '\\'+c)+'$' );
		let template_files = await FS.find( directories, pattern, this.options.reload !== false ? ( event, path ) =>
		{
			switch( event )
			{
				case 'created'	: return this._register_template( path, pattern );
				case 'modified'	: return this._update_template( path, pattern );
				case 'deleted'	: return this._unregister_template( path, pattern );
			}
		} : undefined );

		this.templates = new Map();

		for( let path of template_files )
		{
			this._register_template( path, pattern );
		}
	}

	_load( template )
	{
		return new Promise(( resolve, reject ) =>
		{
			require('fs').readFile( template.path, 'utf8', ( err, data ) =>
			{
				if( !err && data.length )
				{
					template.render = new Code( template.path ).compile( this.parser.parse( data ), 'parameters', 'scope', 'render_scope' );

					resolve( template );
				}
				else{ reject( err ); }
			});
		});
	}

	_get( template )
	{
		let template_scripts = this.templates.get( template.replace(/^.*\//,'') );

		if( template_scripts && template_scripts.length )
		{
			if( !template_scripts[0].render )
			{
				return this._load( template_scripts[0] );
			}
			else{ return template_scripts[0]; }
		}
	}

	async _render( template, parameters, scope = {}, render_scope )
	{
		return ( await this._get( template.toLowerCase() ) ).render( parameters, scope, render_scope );
	}

	render( template, parameters, scope = {}, render_scope = undefined )
	{
		return new Promise( async( resolve, reject ) =>
		{
			try
			{
				let render = await this._render( template, parameters, scope,
				{
					__TEMPLATE: this._render.bind( this )
				});

				let styles = [], scripts = [];

				for( let id in render.styles )
				{
					styles.push( render.styles[id] );
				}
				for( let id in render.scripts )
				{
					scripts.push( render.scripts[id] );
				}

				styles = ( styles.length ? '<style>' + styles.join('') + '</style>' : '' );
				scripts = ( scripts.length ? '<script>' + scripts.join(';') + '</script>' : '' );

				if( styles || scripts )
				{
					let match;

					if( match = render.render.match(/<\/head(\s+[^>]*>|>)/im) )
					{
						render.render = render.render.substr( 0, match.index ) + styles + scripts + render.render.substr( match.index );
					}
					else if( match = render.render.match(/<body(\s+[^>]*>|>)/im) )
					{
						render.render = render.render.substr( 0, match.index + match[0].length ) + styles + scripts + render.render.substr( match.index + match[0].length );
					}
					else
					{
						render.render = styles + scripts + render.render;
					}
				}

				resolve( render.render );
			}
			catch( err ){ reject( err ); }
		});
	}
}

/*

let promises = [];
let values [  ];

Promise.all().join('');*/
