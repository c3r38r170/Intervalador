/* libs */

const W=window,D=document
	,ALL=true,ONLY_ONE=false
	,OTHER=-1,NUMBER=0,STRING=1,ARRAY=2,OBJECT=3,BOOLEAN=4,NULL=5;
var B;

addEventListener('DOMContentLoaded',()=>{
	B=D.body;
});

function is(variable,type){
	if(variable==null && type==NULL)
		return true;
	let types={
		[NUMBER]:['number',Number]
		,[STRING]:['string',String]
		,[BOOLEAN]:['boolean',Boolean]
	}
	switch(type){
		case 0:
		case 1:
		case 4:
			return types[type][0]==typeof variable || variable instanceof types[type][1];
		case 2:
			return Array.isArray(variable);
		case 3:
			return 'object'==typeof variable && !Array.isArray(variable);
	}
}

function createNode(element,options,onlyChild){
	if(!element)
		return;
	
	let finalFun;
	
	if(is(element,ARRAY))
		[element,options,onlyChild]=element;
	if(is(element,STRING))
		if(element=element.trim())
			element=D.createElement(element.toUpperCase());
		else return;
	
	if(options && (options.nodeType || !is(options,OBJECT))){
		onlyChild=options;
		options=null;
	}
	
	let value;
	if(options)
		for(let key in options){
			value=options[key];
			
			switch(key){
			case 'class':
				element.classList.add(value);
				break;
			case 'classList':
				for(let item of value)
					element.classList.add(item);
				break;
			case 'finalFun':
				finalFun=value;
				break;
			case 'children':
				addNode(element,...value);
				break;
			default:
				if(key.substring(0,2)=='on' && is(value,STRING))
					if(value.match('[^a-zA-Z0-9_]'))
						element[key]=new Function(value);
					else element[key]=W[value];
				else if(key.substring(0,2)!='on' && element[key]==undefined)
					element.setAttribute(key,value);
				else if(is(value,OBJECT)) //style, dataset
					Object.assign(element[key],value);
				else element[key]=value;
				break;
			}
		}
	if(onlyChild)
		element.appendChild(onlyChild.nodeType?onlyChild:createNode(onlyChild));
	if(finalFun)
		(typeof finalFun=='string'?new Function(finalFun):finalFun).call(element);
	return element;
}

function addNode(parent,...children){
	let results=[];
	for(let child of children)
		if(child)
			results.push(parent.appendChild(child.nodeType?child:createNode(child)));
	return results.length>1?results:results[0];
}

function SqS(selector,cantidad=ONLY_ONE,ancestroComun=D){
	if(selector instanceof Node)//??? Node vs Element
		return selector;
	if(is(selector,STRING)){
		let resultados
			,restoDeSelector=selector.slice(1);
		if(/[ :\[\.#,]/.test(restoDeSelector))
			if(!cantidad||cantidad===1)
				return ancestroComun.querySelector(selector)
			else if(cantidad===true)
				return ancestroComun.querySelectorAll(selector);
			else resultados=ancestroComun.querySelectorAll(selector);
		else switch(selector[0]){
		case '#':
			return D.getElementById(restoDeSelector);
		case '.':
			resultados=ancestroComun.getElementsByClassName(restoDeSelector);
			break;
		case '[':
			let nameMatch=/^\[name="([^"]*)"\]$/.exec(selector);
			if(nameMatch)
				resultados=D.getElementsByName(nameMatch[1]);
			break;
		case ':':
			break;
		default:
			resultados=ancestroComun.getElementsByTagName(selector);
		}
		if(!cantidad||cantidad===1)
			return resultados?resultados[0]:D.querySelector(selector);
		else if(cantidad===true)
			return resultados?resultados:D.querySelectorAll(selector);
		else{
			if(!resultados)
				resultados=D.querySelectorAll(selector);
			if(cantidad>=resultados.length)
				return resultados;
			let respuesta=[];
			for(let i=0;i<cantidad;i++)
				respuesta.push(resultados[i]);
			return respuesta;
		}
	}else return false;
}

/* Intervalador */

var nextID=1,ciclos={};

class SafeAudio{
	static audioCtx=new AudioContext();
	static audiosCargados={};

	isReady=false;
	shouldBePlaying=false;
	audio;
	src;
	loop;

	constructor(src,loop){
		this.loop=loop;
		
		if(SafeAudio.audiosCargados[src]){
			this.src=SafeAudio.audiosCargados[src];
			this.buildAudio();
			this.isReady=true;
		}else{
			fetch(src)
				.then(response=> response.arrayBuffer())
				.then(arrayBuffer=>SafeAudio.audioCtx.decodeAudioData(arrayBuffer))
				.then(audioBuffer=> {
					if(!SafeAudio.audiosCargados[src])
						SafeAudio.audiosCargados[src]=audioBuffer;
					this.src=audioBuffer;
					this.buildAudio();
					this.isReady=true;

					if(this.shouldBePlaying)
						this.audio.start();
				});
		}

	}
	isPaused(){
		return !this.isPlaying();
	}
	isPlaying(){
		return this.shouldBePlaying;
	}
	pause(){
		if(!this.shouldBePlaying)
			return;

		this.shouldBePlaying=false;
		if(this.isReady){
			this.audio.stop();
			this.buildAudio();
		}
	}
	play(){
		if(this.shouldBePlaying)
			return;

		this.shouldBePlaying=true;
		if(this.isReady)
			this.audio.start();
	}
	kill(){
		if(this.ready && this.shouldBePlaying)
			this.audio.stop();
		delete this.audio;
	}
	buildAudio(){
		let audio=SafeAudio.audioCtx.createBufferSource();
		audio.loop=this.loop;
		audio.buffer=this.src;
		audio.connect(SafeAudio.audioCtx.destination);
		this.audio=audio;
	}
}

class Temporizador{
	static ESTADO={
		PAUSA:1
		,REPRODUCIENDOSE:2
		,TERMINADO:0
	}

	audio;
	duracion;
	segundosRestantes;

	botonReproduccion;
	visor;
	
	intervalID;

	constructor({
		segundos
		,botonReproduccion
		,visor
		,alarma='default.mp3'
	}){
		this.audio=new SafeAudio(alarma,true);

		this.segundosRestantes = this.duracion = segundos;

		this.botonReproduccion=botonReproduccion;
		this.visor=visor;
		this.actualizarVisor();
		
		this.estado=Temporizador.ESTADO.PAUSA;
	}
	cambiarReproduccion(){
		switch(this.estado){
		case Temporizador.ESTADO.PAUSA:
			this.reproducir();
			break;
		case Temporizador.ESTADO.REPRODUCIENDOSE:
			this.ponerEstado(Temporizador.ESTADO.PAUSA);
			break;
		case Temporizador.ESTADO.TERMINADO:
			this.audio.pause();
			this.botonReproduccion.disabled=true;
			this.botonReproduccion.classList.remove('reproduciendo');
			this.visor.classList.remove('blink');
			break;
		}
	}
	ponerEstado(estado){
		this.estado=estado;

		if(estado==Temporizador.ESTADO.TERMINADO)
			return;

		this.botonReproduccion.classList.remove('blink-once');
		setTimeout(()=>this.botonReproduccion.classList.add('blink-once'),1);
		//timeout para que cambie a la mitad de la animación
		setTimeout(()=>{
			this.botonReproduccion.classList[({
				[Temporizador.ESTADO.PAUSA]:'remove'
				,[Temporizador.ESTADO.REPRODUCIENDOSE]:'add'
			})[estado]]('reproduciendo');
		},150);
	}
	actualizarVisor(){
		let h=Math.floor(this.segundosRestantes/3600)
			,m=Math.floor(this.segundosRestantes/60%60)
			,s=this.segundosRestantes%60;
		this.visor.innerText=`${h}:${m<10?0:''}${m}:${s<10?0:''}${s}`;
	}
	reproducir(){
		if(this.estado==Temporizador.ESTADO.REPRODUCIENDOSE
			||this.estado==Temporizador.ESTADO.TERMINADO)
			return;

		this.ponerEstado(Temporizador.ESTADO.REPRODUCIENDOSE);
		let myID=this.intervalID=setInterval(()=>{
			if(
				myID!=this.intervalID
				|| this.estado==Temporizador.ESTADO.PAUSA
			){
				clearInterval(myID);
				return;
			}
			
			this.segundosRestantes--;
			if(this.segundosRestantes==0){
				clearInterval(this.intervalID);
				this.ponerEstado(Temporizador.ESTADO.TERMINADO);
				if(this.onFinish){
					this.reiniciar();
					this.onFinish()
				}else{
					this.visor.classList.add('blink');
					this.audio.play();
				}
			}
			this.actualizarVisor();
		},1000);
	}
	reiniciar(){
		if(this.estado!=Temporizador.ESTADO.PAUSA)
			this.ponerEstado(Temporizador.ESTADO.PAUSA);

		if(this.audio.isPlaying()){
			this.audio.pause();
			//delay para no ver el rebote del retraso de .reproduciendo
			setTimeout(()=>this.visor.classList.remove('blink'),150);
		}
		
		if(this.botonReproduccion.disabled)
			this.botonReproduccion.disabled=false;
		
		this.segundosRestantes=this.duracion;

		this.actualizarVisor();
	}
	matarAudio(){
		this.audio.kill();
	}
}

class Ciclo{
	intervalo;
	duracion;
	id=nextID++;
	elemento;

	constructor({
		nombre
		,intervalo
		,duracion
		,alarma
		,color
		,enlaceDirecto
		,enlaceVuelta
		,sonido='sonido-default.mp3'
	}){
		this.elemento=B.appendChild(createNode('div',{
			class:'ciclo'
			,dataset:{id:this.id}
			,style:{backgroundColor:'rgb('+color+')'}
			,children:[
				['SPAN',{
					class:'nombre'
					,innerText:nombre
				}]
				,['BUTTON',{class:'eliminar'}]

				,['SPAN',{class:'intervalo-titulo',innerText:'Intervalo'}]
				,['SPAN',{class:'duracion-titulo',innerText:'Duración'}]

				,['BUTTON',{
					class:'reiniciar'
					,dataset:{tipo:'intervalo'}
				}]
				,['BUTTON',{
					class:'cambiarReproduccion'
					,dataset:{tipo:'intervalo'}
				}]
				,['BUTTON',{
					class:'reiniciar'
					,dataset:{tipo:'duracion'}
				}]
				,['BUTTON',{
					class:'cambiarReproduccion'
					,dataset:{tipo:'duracion'}
				}]

				,['SPAN',{
					classList:['visor','intervalo-visor']
					,dataset:{tipo:'intervalo'}
				}]
				,['SPAN',{
					classList:['visor','duracion-visor']
					,dataset:{tipo:'duracion'}
				}]
			]
		}));
		ciclos[this.id]=this;
		
		if(intervalo){
			this.intervalo=new Temporizador({
				segundos:intervalo
				,botonReproduccion:SqS('.cambiarReproduccion[data-tipo="intervalo"]',ONLY_ONE,this.elemento)
				,visor:SqS('.visor[data-tipo="intervalo"]',ONLY_ONE,this.elemento)
			});
		}else{
			SqS('.cambiarReproduccion[data-tipo="intervalo"]',ONLY_ONE,this.elemento).disabled=true;
			SqS('.reiniciar[data-tipo="intervalo"]',ONLY_ONE,this.elemento).disabled=true;
		}
		if(duracion){
			this.duracion=new Temporizador({
				segundos:duracion
				,botonReproduccion:SqS('.cambiarReproduccion[data-tipo="duracion"]',ONLY_ONE,this.elemento)
				,visor:SqS('.visor[data-tipo="duracion"]',ONLY_ONE,this.elemento)
			});
		}else{
			SqS('.cambiarReproduccion[data-tipo="duracion"]',ONLY_ONE,this.elemento).disabled=true;
			SqS('.reiniciar[data-tipo="duracion"]',ONLY_ONE,this.elemento).disabled=true;
		}

		// TODO la implementacion entera de esto da asco
		if(intervalo && duracion){
			if(enlaceDirecto)
				this.intervalo.onFinish=()=>{
					new SafeAudio(sonido,false).play();
					if(this.duracion.estado==Temporizador.ESTADO.TERMINADO)
						this.duracion.reiniciar();
					this.duracion.reproducir();
				};
			if(enlaceVuelta)
				this.duracion.onFinish=()=>{
					new SafeAudio(sonido,false).play();
					if(this.intervalo.estado==Temporizador.ESTADO.TERMINADO)
						this.intervalo.reiniciar();
					this.intervalo.reproducir();
				};
		}
	}

	eliminar(){
		// TODO test if this deletes everything, audio included
		if(this.duracion)
			this.duracion.matarAudio();
		if(this.intervalo)
			this.intervalo.matarAudio();
		this.elemento.remove();
		delete ciclos[this.id];
	}
}

addEventListener('DOMContentLoaded',()=>{
	B.onclick=e=>{
		let t=e.target;
		if(t.tagName!='BUTTON')
			return;

		let thisCiclo=ciclos[t.closest('.ciclo').dataset.id];
		if(t.classList.contains('eliminar'))
			thisCiclo.eliminar();
		else thisCiclo[t.dataset.tipo][t.classList[0]]();
	}
});