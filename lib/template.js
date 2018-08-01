'use strict';

const FS = require('liqd-fs');
const Parser = require('liqd-parser');
const Code = require('./code');

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
		let template_files = await FS.find( directories, pattern, ( event, path ) =>
		{
			switch( event )
			{
				case 'created'	: return this._register_template( path, pattern );
				case 'modified'	: return this._update_template( path, pattern );
				case 'deleted'	: return this._unregister_template( path, pattern );
			}
		});

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
					template.render = new Code().compile( this.parser.parse( data ), 'parameters', 'scope', 'render_scope' );

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

	render( template, parameters, scope = {}, render_scope = undefined )
	{
		return new Promise( async( resolve, reject ) =>
		{
			try
			{
				template = await this._get( template.toLowerCase() );

				let render = '';

				if( template )
				{
					if( render_scope === undefined )
					{
						render_scope =
						{
							__TEMPLATE: this.render.bind( this )
						}
					}

					render += await template.render( parameters, scope, render_scope );
				}

				resolve( render );
			}
			catch( err ){ reject( err ); }
		});
	}
}

/*

let promises = [];
let values [  ];

Promise.all().join('');*/
