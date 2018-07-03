'use strict';

const Template = require('../lib/template');
const template = new Template();

require('http').createServer( ( req, res ) =>
{
	let start = process.hrtime(), render;
	template.load( __dirname + '/source.template', true );

	res.end( render = template.render( __dirname + '/source.template',
	{
		id: 'Slajder', ratio: 0.3881818182, slides:
		[
			{ img: 'https://www.izlato.sk/face/images/slides/sk/prstene2-sk-md-32.jpg', title: 'prstene', url: 'prstene' },
			{ img: 'https://www.izlato.sk/face/images/slides/sk/koncovky-sk-md-4.jpg', title: 'koncovky', url: 'koncovky' },
			{ img: 'https://www.izlato.sk/face/images/slides/sk/zlava10-sk-md-19.jpg', title: 'zlava10', url: 'zlava10' },
			{ img: 'https://www.izlato.sk/face/images/slides/sk/prstene-sk-md-3.jpg', title: 'prstene', url: 'prstene' }
		]
	},
	{} ));

	let end = process.hrtime(start);

	console.log( render );
	console.log( ( render.length / 1024 ).toFixed(2) + 'kB in ' + ( end[0] * 1000 + end[1] / 1e6 ).toFixed(4) + 'ms' );

})
.listen(8080);
/*

let start = process.hrtime(), len = 0, i, render;

for( i = 0; i < 1000; ++i )
{
	len += ( render = template.render( __dirname + '/source.template', { id: 'Slajder', ratio: 0.3, slides: [
		{ img: 'a', title: 'a', url: 'a' },
		{ img: 'b', title: 'b', url: 'b' },
		{ img: 'c', title: 'c', url: 'c' },
		{ img: 'd', title: 'd', url: 'd' }
	] }, {} )).length;
}

let end = process.hrtime(start);

console.log( ( ( end[0] * 1000 + end[1] / 1e6 ) ).toFixed(4) + 'ms' );
console.log( ( ( end[0] * 1000 + end[1] / 1e6 ) / i ).toFixed(4) + 'ms', len / i );
console.log( render );

//template.render({ test: 'test' });*/
