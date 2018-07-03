with( scope ) with( parameters )
{
	//console.log(Object.assign( Object.assign({}, scope), parameters ));

	let render = '';

	render += `<janko class=" hrasko ">`;
	render += `<style type="text/css">html, body
	{
		margin:0;
		padding:0;
		background:blue;
	}
	a
	{
		color:red;
	}
	a:hover
	{
		color:blue;
		text-decoration:none;
	}</style>`;
	render += `<script type="text/javascript">Scriptik</script>`;
	render += `<script type="text/javascript" test=` + ( peto ) + `>Scriptik</script>`;
	render += `<script type="text/javascript">S
		cri
		pticek</script>`;
	render += `<hrasko/>`;
	render += `<marienka>`;
	render += `fero `;
	render += `jozo `;
	render += `</marienka>`;
	render += `<style type="text/css">div
	{
		color:silver;
		background:red;
	}</style>`;
	render += ( jozko.hrasko );
	render += `<Sablonka.je.tu jozo="` + test.fn('abc', 10) + `"/>`;
	for( let item of items )
	{
		render += `<Sablonka.je.tu jozo="` + item + `"/>`;
	}
	render += `dasda `;
	render += `</janko>hrasko`;

	return render;
}
