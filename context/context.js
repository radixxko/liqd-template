const vm = require('vm'), fs = require('fs');

//const moduled = require('./source.js');
//const scripted = new vm.Script( fs.readFileSync( __dirname + '/source.js', 'utf8' ).replace(/module\.exports\s*=\s*function\s*\([^\)]*\)/,'').replace(/return .*?;/,'') );
const functioned = new Function( 'scope', 'parameters', fs.readFileSync( __dirname + '/source.js', 'utf8' ).replace(/module\.exports\s*=\s*function\s*\([^\)]*\)/,'') );

//const functioned = function(){ console.log( this ); with(this){ return peto + ' ' + jozko.hrasko; } }
const scope =
{
	peto: 'Peter',
	jozko: { hrasko: 'Janko Hrasko' },
	items: [ 'janko', 'hrasko', 'marienka', 'peter' ],
	test: { fn: ( x, n ) => x.repeat(n) }
}

let start = process.hrtime(), len = 0, i, render;

for( i = 0; i < 100000; ++i )
{
	//len += moduled( scope ).length;
	//len += scripted.runInThisContext();
	//len += scripted.runInThisContext({ scope });
	len += ( render = functioned(scope, { testik: 'Testik' })).length;
}

let end = process.hrtime(start);

console.log( render );
console.log( ( ( end[0] * 1000 + end[1] / 1e6 ) / i ).toFixed(4) + 'ms', len / i );
