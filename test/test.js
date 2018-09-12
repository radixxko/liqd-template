'use strict';

const Template = require('../lib/template.js');
const template = new Template({ directory: __dirname + '/templates', extension: 'template', internationalization: { locale: 'en', dictionary: __dirname + '/locales/main.json' } });

require('http').createServer( async( req, res ) =>
{
	if( false )
	{
		let start = process.hrtime(), render;

		res.end( render = await template.render('source',
		{
			id: 'Slajder', ratio: 0.3881818182, slides:
			[
				/*{ img: 'https://www.izlato.sk/face/images/slides/sk/prstene2-sk-md-32.jpg', title: 'prstene', url: 'prstene' },
				{ img: 'https://www.izlato.sk/face/images/slides/sk/koncovky-sk-md-4.jpg', title: 'koncovky', url: 'koncovky' },
				{ img: 'https://www.izlato.sk/face/images/slides/sk/zlava10-sk-md-19.jpg', title: 'zlava10', url: 'zlava10' },
				{ img: 'https://www.izlato.sk/face/images/slides/sk/prstene-sk-md-3.jpg', title: 'prstene', url: 'prstene' }*/
			]
		},
		{} ));

		let end = process.hrtime(start);

		//console.log( render );
		console.log( ( render.length / 1024 ).toFixed(2) + 'kB in ' + ( end[0] * 1000 + end[1] / 1e6 ).toFixed(4) + 'ms' );
	}
	else
	{
		let start = process.hrtime(), render, i;

		for( i = 0; i < 1; ++i )
		{
			render = await template.render('page',
			{
				__locale: Math.random() < 0.5 ? 'de' : 'en',
				//items: [ 'a', 'b', 'c', 'ddd', 'brb' ],
				items: { 'a': 'aa', 'b': 'bb', 'c' : 'cc', 'd': 'dd', 't': 'brb' },
				template: 'footer'
			},
			{ test: a => a.repeat(5) });
		}

		res.end( render );

		let end = process.hrtime(start);

		//console.log( render );
		console.log( ( render.length / 1024 ).toFixed(2) + 'kB in ' + (( end[0] * 1000 + end[1] / 1e6 ) / i ).toFixed(4) + 'ms' );
	}

})
.listen(8080);
