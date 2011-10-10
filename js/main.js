			if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

			var container, stats;

			var camera, scene, renderer, projector;
			
			var objects = [], plane, geometry, plane, clicks=[], parent;

			var mouse = new THREE.Vector2(),
				offset = new THREE.Vector3(),
				INTERSECTED, 
				SELECTED,
				BRUSHTYPE = 'POINT';
			
			var foregroundColorSelector,
    			backgroundColorSelector,
    			menu,
    			COLOR = [0,0,0],
    			BACKGROUND_COLOR = [255,255,255],
    			BRUSHES = ['LINE', 'POLYGON', 'RECTANGLE'],
    			palette,
    			STORAGE = window.localStorage,
    			//canvas,
    			//flattenCanvas,
    			//context,
    			isFgColorSelectorVisible = false,
    			isBgColorSelectorVisible = false,
    			isAboutVisible = false,
    			isMenuMouseOver = false,
    			shiftKeyIsDown = false,
    			altKeyIsDown = false;
			//var mouseX = 0, mouseY = 0;

			var mesh;
			var windowHalfX = window.innerWidth / 2;
			var windowHalfY = window.innerHeight / 2;

			//document.addEventListener( 'mousemove', onDocumentMouseMove, false );
			var lightS = {type: 'v3', value: new THREE.Vector3(1,1,0)};
			
			// var shaderMaterial = new THREE.MeshShaderMaterial({
				// uniforms:       {
					// color: {type: 'v3', value: new THREE.Vector3(1,0,1)}, 
					// lightsource: lightS
					// },
				// vertexShader:   $('#vertpt').text(),
				// fragmentShader: $('#fragpt').text()
			// });
			
			init();
			animate();

			function init() {
				if (window.File && window.FileReader && window.FileList && window.Blob) {
  					// Great success! All the File APIs are supported.
				} else {
  					alert('The File APIs are not fully supported in this browser.');
				}
				
				setupScene();
				setupMenu();
			}
			function setupMenu()
			{
				palette = new Palette();
				container.appendChild( renderer.domElement );
				foregroundColorSelector = new ColorSelector(palette);
				foregroundColorSelector.addEventListener('change', onForegroundColorSelectorChange, false);
				container.appendChild(foregroundColorSelector.container);

				backgroundColorSelector = new ColorSelector(palette);
				backgroundColorSelector.addEventListener('change', onBackgroundColorSelectorChange, false);
				container.appendChild(backgroundColorSelector.container);
				menu = new Menu();
				menu.foregroundColor.addEventListener('click', onMenuForegroundColor, false);
				menu.backgroundColor.addEventListener('click', onMenuBackgroundColor, false);
				menu.save.addEventListener('click', onMenuSave, false);
				menu.clear.addEventListener('click', onMenuClear, false);
				menu.container.addEventListener('mouseover', onMenuMouseOver, false);
				menu.container.addEventListener('mouseout', onMenuMouseOut, false);
				container.appendChild(menu.container);
			}
			
			function setupScene(){
				container = document.createElement( 'div' );
				document.body.appendChild( container );

				camera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, (window.innerHeight) / 2, (window.innerHeight) / - 2, 1, 1000 );
				camera.position.z = 600;


				scene = new THREE.Scene();
				scene.fog = new THREE.Fog( 0x000000, 1, 1500 );


				var light = new THREE.PointLight( 0xff2200 );
				light.position.set( 100, 100, 100 );
				scene.add( light );

				var light = new THREE.AmbientLight( 0x333333 );
				scene.add( light );


				var geometry = new THREE.CubeGeometry( 100, 100, 100 );
				//var material = [new THREE.MeshLambertMaterial( { color: 0xffffff, morphTargets: true } ), shaderMaterial];
				var material = new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff } );
				//var material = new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff, shading: THREE.FlatShading } );
				// construct 8 blend shapes

				// for ( var i = 0; i < geometry.vertices.length; i ++ ) {
// 
// 					var vertices = [];
// 
// 					for ( var v = 0; v < geometry.vertices.length; v ++ ) {
// 
// 						vertices.push( new THREE.Vertex( geometry.vertices[ v ].position.clone() ) )
// 
// 						if ( v === i ) {
// 
// 							vertices[ vertices.length - 1 ].position.x *= 2;
// 							vertices[ vertices.length - 1 ].position.y *= 2;
// 							vertices[ vertices.length - 1 ].position.z *= 2;
// 
// 						}
// 
// 					}
// 
// 					geometry.morphTargets.push( { name: "target" + i, vertices: vertices } );
// 
// 				}
				parent = new THREE.Object3D();
				//parent.position.y = 50;
				objects.push(parent);
				scene.add( parent );
				mesh = new THREE.Mesh( geometry, material );
				mesh.overdraw = true;
				objects.push(mesh);
				scene.add( mesh );
				geometry = new THREE.SphereGeometry( 50, 50, 50 );
				mesh = new THREE.Mesh( geometry, material );
				mesh.overdraw = true;
				mesh.position.x = 200;
				objects.push(mesh);
				scene.add( mesh );
				plane = new THREE.Mesh( new THREE.PlaneGeometry( window.innerWidth, window.innerHeight, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.25, transparent: true, wireframe: true } ) );
				plane.lookAt( camera.position );
				plane.visible = false;
				scene.add( plane )
				
				renderer = new THREE.WebGLRenderer( { clearColor:0x918D8D, clearAlpha: 1, antialias:true } );
				//renderer = new THREE.CanvasRenderer({ clearColor:0x918D8D, clearAlpha: 1});
				renderer.setSize( window.innerWidth, window.innerHeight );
				//container.appendChild( renderer.domElement );
				renderer.sortObjects = false;
				projector = new THREE.Projector();

				
				renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
				renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
				renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
			}
			
			function onMenuForegroundColor()
			{
				cleanPopUps();
	
				foregroundColorSelector.show();
				foregroundColorSelector.container.style.left = ((window.innerWidth - foregroundColorSelector.container.offsetWidth) / 2) + 'px';
				foregroundColorSelector.container.style.top = ((window.innerHeight - foregroundColorSelector.container.offsetHeight) / 2) + 'px';

				isFgColorSelectorVisible = true;
			}

			function onMenuBackgroundColor()
			{
				cleanPopUps();

				backgroundColorSelector.show();
				backgroundColorSelector.container.style.left = ((window.innerWidth - backgroundColorSelector.container.offsetWidth) / 2) + 'px';
				backgroundColorSelector.container.style.top = ((window.innerHeight - backgroundColorSelector.container.offsetHeight) / 2) + 'px';

				isBgColorSelectorVisible = true;
			}
			
			// COLOR SELECTORS

			function onForegroundColorSelectorChange( event )
			{
				COLOR = foregroundColorSelector.getColor();
	
				menu.setForegroundColor( COLOR );

				if (STORAGE)
				{
					localStorage.brush_color_red = COLOR[0];
					localStorage.brush_color_green = COLOR[1];
					localStorage.brush_color_blue = COLOR[2];		
				}
			}

			function onBackgroundColorSelectorChange( event )	
			{
				BACKGROUND_COLOR = backgroundColorSelector.getColor();
	
				menu.setBackgroundColor( BACKGROUND_COLOR );
	
				document.body.style.backgroundColor = 'rgb(' + BACKGROUND_COLOR[0] + ', ' + BACKGROUND_COLOR[1] + ', ' + BACKGROUND_COLOR[2] + ')';
	
				if (STORAGE)
				{
					localStorage.background_color_red = BACKGROUND_COLOR[0];
					localStorage.background_color_green = BACKGROUND_COLOR[1];
					localStorage.background_color_blue = BACKGROUND_COLOR[2];				
				}
			}
			function onMenuSave()
			{
				
				//flatten();
				//window.open(flattenCanvas.toDataURL('image/png'),'mywindow');
			}
			
			
			function onMenuClear()
			{
				//scene.objects=[];
				objects = [];
				scene = new THREE.Scene();
				scene.fog = new THREE.Fog( 0x000000, 1, 15000 );


				var light = new THREE.PointLight( 0xff2200 );
				light.position.set( 100, 100, 100 );
				scene.add( light );

				var light = new THREE.AmbientLight( 0x333333 );
				scene.add( light );
				
				parent = new THREE.Object3D();
				//parent.position.y = 50;
				objects.push(parent);
				scene.add( parent );
				
				plane = new THREE.Mesh( new THREE.PlaneGeometry( window.innerWidth, window.innerHeight, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0x000000, opacity: 0.25, transparent: true, wireframe: true } ) );
				plane.lookAt( camera.position );
				plane.visible = false;
				scene.add( plane );
				
				render();
			}
			
			function onMenuMouseOver()
			{
				isMenuMouseOver = true;
			}

			function onMenuMouseOut()
			{
				isMenuMouseOver = false;
			}
			
			function onDocumentDragEnter( event )
			{
				event.stopPropagation();
				event.preventDefault();
			}

			function onDocumentDragOver( event )
			{
				event.stopPropagation();
				event.preventDefault();
			}
			function onDocumentDrop( event )
			{
				event.stopPropagation();  
				event.preventDefault();
	
				var file = event.dataTransfer.files[0];
	
				if (file.type.match(/image.*/))
				{
					/*
		 			* TODO: This seems to work on Chromium. But not on Firefox.
		 			* Better wait for proper FileAPI?
		 			*/

					var fileString = event.dataTransfer.getData('text').split("\n");
					document.body.style.backgroundImage = 'url(' + fileString[0] + ')';
				}	
			}
			
			function cleanPopUps()
			{
				if (isFgColorSelectorVisible)
				{
					foregroundColorSelector.hide();
					isFgColorSelectorVisible = false;
				}
		
				if (isBgColorSelectorVisible)
				{
					backgroundColorSelector.hide();
					isBgColorSelectorVisible = false;
				}
			}
			function onDocumentMouseMove(event) {

				mouseX = ( event.clientX - windowHalfX );
				mouseY = ( event.clientY - windowHalfY ) * 2;

			}

			function animate() {

				requestAnimationFrame( animate );
				render();

			}

			function render() {

				//camera.lookAt( scene.position );
				BRUSHTYPE = menu.selector.value;
				renderer.render( scene, camera );

			}
			
			function onDocumentMouseMove( event ) {

				event.preventDefault();

				mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
				mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

				//

				var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
				projector.unprojectVector( vector, camera );

				var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );


				if ( SELECTED ) {

					var intersects = ray.intersectObject( plane );
					SELECTED.position.copy( intersects[ 0 ].point.subSelf( offset ) );
					return;

				}


				var intersects = ray.intersectObjects( objects );

				if ( intersects.length > 0 ) {

					if ( INTERSECTED != intersects[ 0 ].object ) {

						if ( INTERSECTED ) {
							INTERSECTED.materials[ 0 ].color.setHex( INTERSECTED.currentHex );
						}
						
						INTERSECTED = intersects[ 0 ].object;
						var index = scene.objects.indexOf(INTERSECTED);
						INTERSECTED.currentHex = INTERSECTED.materials[ 0 ].color.getHex();
						INTERSECTED.material = new THREE.MeshBasicMaterial( { color: 0xf5894e } );
						scene.objects[index].materials = [ new THREE.MeshBasicMaterial( { color: 0xff0000}) ];
						plane.position.copy( INTERSECTED.position );

					}

					container.style.cursor = 'pointer';

				} else {

					if ( INTERSECTED ) INTERSECTED.materials[ 0 ].color.setHex( INTERSECTED.currentHex );

					INTERSECTED = null;

					container.style.cursor = 'auto';

				}
				if(!event.shiftKey){
					createObject();
					clicks=[];
				}
				render();

			}
			
			function createObject(){
				switch(BRUSHTYPE){
					case 'LINE':
						if(clicks.length>1) {
							geometry = new THREE.Geometry();
							for(var i in clicks){
								geometry.vertices.push(new THREE.Vertex( clicks[i] ));
							}
							addLine(geometry,Math.random()*0xffffff);
						}
					break;
					case 'POINT':
						if(clicks.length === 1) {
							addPoint(clicks, Math.random() * 0xffffff , 0,0);
						}
					break;
					case 'CIRLCE':
					break;
					case 'POLYGON':
					if(clicks.length > 3) {
							var californiaShape = new THREE.Shape(clicks);
							var california3d = new THREE.ExtrudeGeometry( californiaShape, { amount: 5	} );
							//var californiaPoints = californiaShape.createPointsGeometry();
							addMesh(california3d, Math.random() * 0xffffff , 0,0);
						}
					break;
					case 'RECTANGLE':
					if(clicks.length > 1 && clicks.length < 5) {
							var rec = GetRectangle(clicks); 
							geometry = new THREE.CubeGeometry(rec.xlength,rec.ylength,5);
							mesh = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff } ));
							mesh.position = new THREE.Vector3(rec.x,rec.y,0);
							objects.push(mesh);
							scene.add(mesh);
							//clicks[1] = new THREE.Vector3(clicks[0].x + center.xlength, clicks[0].y, clicks[0].z);
							//clicks[2] = new THREE.Vector3(clicks[1].x, clicks[1].y-center.ylength, clicks[1].z);
							//clicks[3] = new THREE.Vector3(clicks[2].x - center.xlength, clicks[2].y, clicks[2].z);
							//clicks.push(new THREE.Vector3(clicks[0]));
							//var californiaShape = new THREE.Shape(clicks);
							//var california3d = new THREE.ExtrudeGeometry( californiaShape, { amount: 5	} );
							//var californiaPoints = californiaShape.createPointsGeometry();
							//addMesh(california3d, Math.random() * 0xffffff , 0,0);
						}
					break;
				}
			}

			function onDocumentMouseDown( event ) {
				cleanPopUps();
				event.preventDefault();

				var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
				projector.unprojectVector( vector, camera );

				var ray = new THREE.Ray( camera.position, vector.subSelf( camera.position ).normalize() );

				var intersects = ray.intersectObjects( objects );

				if ( intersects.length > 0 ) {

					SELECTED = intersects[ 0 ].object;
					SELECTED.materials[0] = new THREE.MeshBasicMaterial( { color: 0xf5894e } );
					var intersects = ray.intersectObject( plane );
					offset.copy( intersects[ 0 ].point ).subSelf( plane.position );

					container.style.cursor = 'move';

				}else{
					if(event.shiftKey){
						var intersects = ray.intersectScene( scene );
						if(intersects.length === 1){
							clicks.push(intersects[0].point);
						}
					}else{
						clicks=[];
					}
				// make new point here
				}

			}

			function onDocumentMouseUp( event ) {

				event.preventDefault();

				if ( INTERSECTED ) {

					plane.position.copy( INTERSECTED.position );

					SELECTED = null;

				}
				
				container.style.cursor = 'auto';

			}
			
		function addGeometry( geometry, points, spacedPoints, color, x, y, z, rx, ry, rz, s ) {

					// 3d shape

					var mesh = new THREE.Mesh( geometry, [ new THREE.MeshLambertMaterial( { color: color } ), new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true } ) ] );
					mesh.position.set( x, y, z - 75 );
					mesh.rotation.set( rx, ry, rz );
					mesh.scale.set( s, s, s );
					objects.push(mesh);
					parent.add( mesh );

					// solid line

					var line = new THREE.Line( points, new THREE.LineBasicMaterial( { color: color, linewidth: 2 } ) );
					line.position.set( x, y, z + 25 );
					line.rotation.set( rx, ry, rz );
					line.scale.set( s, s, s );
					parent.add( line );

					// transparent line from real points

					var line = new THREE.Line( points, new THREE.LineBasicMaterial( { color: color, opacity: 0.5 } ) );
					line.position.set( x, y, z + 75 );
					line.rotation.set( rx, ry, rz );
					line.scale.set( s, s, s );
					parent.add( line );

					// vertices from real points

					var pgeo = THREE.GeometryUtils.clone( points );
					var particles = new THREE.ParticleSystem( pgeo, new THREE.ParticleBasicMaterial( { color: color, size: 2, opacity: 0.75 } ) );
					particles.position.set( x, y, z + 75 );
					particles.rotation.set( rx, ry, rz );
					particles.scale.set( s, s, s );
					parent.add( particles );

					// transparent line from equidistance sampled points

					var line = new THREE.Line( spacedPoints, new THREE.LineBasicMaterial( { color: color, opacity: 0.2 } ) );
					line.position.set( x, y, z + 100 );
					line.rotation.set( rx, ry, rz );
					line.scale.set( s, s, s );
					parent.add( line );

					// equidistance sampled points

					var pgeo = THREE.GeometryUtils.clone( spacedPoints );
					var particles2 = new THREE.ParticleSystem( pgeo, new THREE.ParticleBasicMaterial( { color: color, size: 2, opacity: 0.5 } ) );
					particles2.position.set( x, y, z + 100 );
					particles2.rotation.set( rx, ry, rz );
					particles2.scale.set( s, s, s );
					parent.add( particles2 );

				}
				
		function addLine(points, color){
					// solid line
					//verts = points.vertices;
					//verts = verts.splice(0,verts.length-1);
					//points.verts = verts;
					//var line = new THREE.ParticleSystem( points, new THREE.ParticleBasicMaterial( { color: color, size: 5, opacity: 1 } ) );
					var line = new THREE.Line( points, new THREE.LineBasicMaterial( { color: color, linewidth: 2 } ) );
					line.updateMatrix();
					//line.position.set( 0,0,0 );
					//line.data = "unfilled";
					objects.push( line );
					parent.add( line );
		}
		
		function addMesh(geometry, color, centerx, centery){
					var mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: color } ) );
					mesh.position.set( centerx, centery, 0 );
					objects.push(mesh);
					parent.add( mesh );
		}
		
		function addPoint(point, color, centerx, centery){
			var geometry = new THREE.SphereGeometry(5,5,5);
			var p = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: color}));
			p.position = point[0];
			p.data = "unassigned";
			//var particles = new THREE.ParticleSystem( point, new THREE.ParticleBasicMaterial( { color: color, size: 2, opacity: 1 } ) );
			//particles.position.set( centerx, centery, 0 );
			objects.push( p );
			parent.add( p );
		}
		
		function GetCenter(points){
			var maxX = maxY = -1e6;
			var minX = minY = 1e6;
			
			for(var i in points){
				if(points[i].x > maxX){
					maxX = points[i].x;
				}
				if(points[i].x < minX){
					minX = points[i].x;
				}
				if(points[i].y > maxY){
					maxY = points[i].y;
				}
				if(points[i].y < minY){
					minY = points[i].y;
				}
			}
			
			ret = {
				x: (maxX-minX)/2.0,
				y: (maxY-minY)/2.0,
			};
			return ret;
		}
		
		function GetRectangle(points){
			var maxX = maxY = -1e6;
			var minX = minY = 1e6;
			
			for(var i in points){
				if(points[i].x > maxX){
					maxX = points[i].x;
				}
				if(points[i].x < minX){
					minX = points[i].x;
				}
				if(points[i].y > maxY){
					maxY = points[i].y;
				}
				if(points[i].y < minY){
					minY = points[i].y;
				}
			}
			
			ret = {
				x: (maxX-minX)/2.0,
				y: (maxY-minY)/2.0,
				xlength: Math.abs(maxX - minX),
				ylength: Math.abs(maxY - minY)
			};
			return ret;
		}