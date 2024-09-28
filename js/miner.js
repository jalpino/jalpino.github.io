class Miner {
	constructor( content ){
		this.content = content;
	}
	getContent(){
		return this.content;
	}
	extract( tag ){
		let pattern = '<'+ tag +'([^>]+)>(.*)<\\/'+ tag +'>';
		let hits = this.content
						.replaceAll(/[\n\r]+/gi,'')
						.replaceAll(/\s{2,}/g,' ')
						.match( pattern, 'ig');
						
		if( hits?.length == 3 ){
			this.content = hits[2].trim();
		}
		return this;
	}
	remove( tag ){
		let pattern = new RegExp('<'+ tag +'([^>]*)>(.*)<\\/'+ tag +'>','gi');
		this.content = this.content.replaceAll( pattern,'');
		return this;
	}	
}