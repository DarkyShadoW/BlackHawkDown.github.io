"use strict";
/* the pages: [title, Spanish, English]; {sk:name} draws a sketch, {btn:id} copies that button's icon */
const MANUAL = [
  ['Índice', `<p class="note">Si encuentras este cuaderno, devuélvelo al Sgto. de la Compañía B, 3/75 Rangers. Aeropuerto de Mogadiscio.</p>
<ol class="toc">
<li data-go="2">La misión manda</li><li data-go="3">Moverse por las calles</li><li data-go="4">Esquinas y cobertura</li><li data-go="5">Lo que para una bala</li>
<li data-go="6">Técnicos y RPG: fuego y supresión</li><li data-go="7">Los heridos</li><li data-go="8">Apoyo aéreo</li>
<li data-go="9">De noche</li><li data-go="10">Los botones</li><li data-go="11">Cómo se portan tus hombres</li><li data-go="12">Lo que no viene en ningún manual</li></ol>`,
`<p class="note">If you find this notebook, return it to the sergeant of Bravo Company, 3/75 Rangers. Mogadishu airfield.</p>
<ol class="toc">
<li data-go="2">The mission comes first</li><li data-go="3">Moving through the streets</li><li data-go="4">Corners and cover</li><li data-go="5">What stops a bullet</li>
<li data-go="6">Technicals and RPGs: fire and suppression</li><li data-go="7">The wounded</li><li data-go="8">Air support</li>
<li data-go="9">At night</li><li data-go="10">The buttons</li><li data-go="11">How your men behave</li><li data-go="12">What no manual tells you</li></ol>`],
  ['1. La misión manda', `<ul>
<li><b>Sigue las indicaciones hacia el objetivo</b>: la flecha y el anillo naranja. No te salgas de la ruta.</li>
<li>Todo lo que hay fuera de la ruta es <u>territorio enemigo</u>: multitudes armadas, barricadas de neumáticos ardiendo, barrios enteros de milicia. Una unidad perdida no dura ni cinco minutos.</li>
<li>Lee los objetivos (arriba a la izquierda) <b>antes</b> de mover a nadie. Si cambian, la pausa automática te avisa.</li>
<li>La <b>pausa táctica</b> (Espacio): para, mira, da las órdenes y sigue. <span class="hl">No es trampa, es oficio.</span></li>
<li>Usa el <b>mapa táctico</b> (N) para ver la ruta entera y dónde está cada pelotón. Quien no sabe dónde están los suyos acaba disparándoles.</li>
<li>Después de cada contacto, <b>repaso ACE</b>: <u>M</u>unición, <u>B</u>ajas, <u>E</u>quipo. Mira las fichas antes de seguir: quién está herido, quién va seco de cargadores.</li>
<li class="red">Que nadie se quede atrás. Un hombre caído es un objetivo más.</li></ul>`,
`<ul>
<li><b>Follow the directions to the objective</b>: the arrow and the orange ring. Do not leave the route.</li>
<li>Everything off the route is <u>enemy ground</u>: armed crowds, barricades of burning tyres, whole militia neighbourhoods. A lost unit does not last five minutes.</li>
<li>Read the objectives (top left) <b>before</b> you move anyone. When they change, the auto-pause tells you.</li>
<li>The <b>tactical pause</b> (Space): stop, look, give the orders, carry on. <span class="hl">It is not cheating, it is the job.</span></li>
<li>Use the <b>tactical map</b> (N) to see the whole route and where each squad is. If you do not know where your own men are, you end up shooting at them.</li>
<li>After every contact, an <b>ACE check</b>: <u>A</u>mmunition, <u>C</u>asualties, <u>E</u>quipment. Look at the cards before moving on: who is hurt, who is low on magazines.</li>
<li class="red">Leave no man behind. A man down is one more objective.</li></ul>`],
  ['2. Moverse por las calles', `{sk:street}<ul>
<li><b class="red">NUNCA</b> lleves a toda la unidad junta. Regla de la granada: <u>5 metros</u> entre hombres, para que una sola no se lleve a dos.</li>
<li><b>Una fila por cada acera</b>, escalonadas. Cada fila vigila la acera <u>contraria</u>: sus ventanas, sus puertas y sus azoteas. En ciudad el enemigo también está <b>arriba</b>.</li>
<li>Nadie camina por el centro de la calle: ahí no hay dónde meterse.</li>
<li><b>Salto vigilado</b>: una escuadra se mueve mientras la otra, parada y apuntando, la cubre. Luego se cambian. Marca los saltos punto a punto con la <i>Ruta</i>.</li>
<li>Los saltos, cortos: <span class="hl">«me levanto, me ven, al suelo»</span>. De 3 a 5 segundos al descubierto, no más.</li>
<li><b>Cruces y plazas</b> son zonas de peligro: primero alguien se asoma y cubre a los dos lados, después se cruza deprisa, y el primero que llega cubre a los que vienen.</li>
<li><b>Alto corto</b>: al llegar, la mitad rodilla en tierra y mirando hacia fuera. Lo hacen solos.</li>
<li>Correr cansa. Un hombre <u>agotado</u> no se mueve hasta recuperar el aliento a cubierto.</li></ul>`,
`{sk:street}<ul>
<li><b class="red">NEVER</b> move the whole unit in one bunch. The grenade rule: <u>5 metres</u> between men, so that one grenade cannot take two.</li>
<li><b>One file on each side of the street</b>, staggered. Each file watches the <u>far</u> side: its windows, doors and rooftops. In a city the enemy is also <b>above</b> you.</li>
<li>Nobody walks down the middle of the street: there is nowhere to go from there.</li>
<li><b>Bounding overwatch</b>: one team moves while the other, halted and aiming, covers it. Then they swap. Mark the bounds point by point with the <i>Route</i>.</li>
<li>Keep the bounds short: <span class="hl">"I'm up, he sees me, I'm down"</span>. Three to five seconds in the open, no more.</li>
<li><b>Crossings and squares</b> are danger areas: first someone looks and covers both ways, then you cross fast, and the first man over covers the ones still coming.</li>
<li><b>Short halt</b>: on arrival half the men take a knee, facing out. They do it themselves.</li>
<li>Running is tiring. An <u>exhausted</u> man will not move until he gets his breath back in cover.</li></ul>`],
  ['3. Esquinas y cobertura', `{sk:corner}<ul>
<li>Cada esquina es una emboscada <u>hasta que alguien se asome</u>. Se «corta el pastel»: separado de la esquina, paso a paso en arco, viendo un trozo más de calle en cada paso. Tus hombres lo hacen solos cuando paran junto a una esquina: <b>déjales ese segundo</b> antes de mandarles cruzar.</li>
<li><b>Cobertura no es lo mismo que ocultación.</b> Un muro de piedra, un bloque de motor o unos sacos terreros paran las balas. Una chapa, una puerta o un puesto del mercado solo te esconden.</li>
<li><b>Cubrirse</b> (C): cada hombre busca el parapeto más cercano entre él y la amenaza.</li>
<li>Puertas y ventanas son un <b>embudo</b>: todo el fuego entra por ahí. Se pasan deprisa y nadie se queda plantado en el hueco.</li>
<li>En las azoteas, agachado: una silueta contra el cielo se ve desde media ciudad.</li>
<li>Bajo mucho fuego un soldado <b>se queda clavado</b>: ni se mueve ni dispara bien. Sácalo de la línea de fuego o suprime al que le dispara.</li></ul>`,
`{sk:corner}<ul>
<li>Every corner is an ambush <u>until someone has looked round it</u>. You "slice the pie": standing off the corner, step by step round an arc, seeing one more slice of street with each step. Your men do it themselves when they halt by a corner: <b>give them that second</b> before you order them across.</li>
<li><b>Cover is not concealment.</b> A stone wall, an engine block or sandbags stop bullets. Sheet metal, a door or a market stall only hide you.</li>
<li><b>Take cover</b> (C): each man finds the nearest cover between him and the threat.</li>
<li>Doors and windows are a <b>funnel</b>: all the fire comes through them. Go through fast and never stand in the opening.</li>
<li>On rooftops, stay low: a silhouette against the sky can be seen from half the city.</li>
<li>Under heavy fire a soldier <b>gets pinned</b>: he will not move and shoots badly. Get him out of the line of fire or suppress whoever is shooting at him.</li></ul>`],
  ['4. Lo que para una bala', `<ul>
<li><b>Cobertura</b> es lo que para las balas; <b>ocultación</b>, lo que solo te esconde. Antes de pararte detrás de algo, pregúntate: <i>¿esto para una bala?</i></li>
<li class="red"><b>Ninguna cobertura es para siempre.</b> Una cobertura sólida también termina deshecha si le cae fuego sin parar: cada impacto arranca un trozo, hasta que se abre un hueco y deja a la unidad al descubierto.</li></ul>
<table class="keys mat">
<tr><td><b>Hormigón, piedra gruesa</b></td><td>La mejor. Aguanta fusil y ametralladora un buen rato; solo un RPG o una 12,7 mm insistiendo la rompen.</td></tr>
<tr><td><b>Sacos terreros</b></td><td>Buenos si están en doble fila. El fuego continuado los va vaciando: rellénalos o cambia de sitio.</td></tr>
<tr><td><b>Ladrillo, bloque</b></td><td>Para el fusil un tiempo. Una ráfaga larga lo desmenuza y una 12,7 mm lo atraviesa.</td></tr>
<tr><td><b>Adobe, barro</b></td><td>Casi todas las casas de Mogadiscio. Aguanta poco: el AK lo perfora si insiste, la ametralladora pesada de un técnico lo cruza de lado a lado.</td></tr>
<tr><td><b>Madera, puertas, chapa, puestos</b></td><td>No paran nada. Solo ocultan.</td></tr>
<tr><td><b>Vehículos</b></td><td>La carrocería y las puertas se atraviesan. Solo paran el <u>bloque del motor</u> y las ruedas: ponte detrás del motor, agachado junto a la rueda. Y con un RPG cerca, aléjate: el coche arde.</td></tr></table>
<ul>
<li><b>Señales de que tu cobertura se acaba:</b> saltan esquirlas y polvo del muro, se ven agujeros, el parapeto se hace más bajo. No esperes al hueco: <span class="hl">muévete antes</span>, con fuego de supresión cubriendo el salto.</li>
<li>No te quedes mucho en el mismo sitio: el enemigo sigue disparando a donde te vio la última vez.</li>
<li>Una esquina de edificio es mejor que un muro suelto: tiene más masa y te deja salir por el otro lado.</li>
<li>Vale también al revés: un miliciano detrás de una puerta, una chapa o un muro de adobe <b>no está a cubierto</b>. Suprime a través del muro y la SAW lo irá abriendo.</li>
<li>El 7,62 del AK atraviesa más que nuestro 5,56. Lo que a ti te cubre de un fusil puede no cubrirte del suyo.</li></ul>`,
`<ul>
<li><b>Cover</b> is what stops bullets; <b>concealment</b> only hides you. Before you stop behind something, ask yourself: <i>will this stop a round?</i></li>
<li class="red"><b>No cover lasts for ever.</b> Even solid cover ends up torn apart if fire keeps hitting it: every round knocks a piece off, until a hole opens and leaves the unit exposed.</li></ul>
<table class="keys mat">
<tr><td><b>Concrete, thick stone</b></td><td>The best. It takes rifle and machine-gun fire for a good while; only an RPG or a 12.7 mm that keeps at it will break it.</td></tr>
<tr><td><b>Sandbags</b></td><td>Good if they are two deep. Sustained fire empties them: refill them or move.</td></tr>
<tr><td><b>Brick, block</b></td><td>Stops rifle fire for a time. A long burst crumbles it and a 12.7 mm goes through.</td></tr>
<tr><td><b>Mud brick, adobe</b></td><td>Most houses in Mogadishu. It does not hold long: an AK punches through if it keeps at it, a technical's heavy machine gun goes right through.</td></tr>
<tr><td><b>Wood, doors, sheet metal, stalls</b></td><td>Stop nothing. They only hide you.</td></tr>
<tr><td><b>Vehicles</b></td><td>Body panels and doors are shot through. Only the <u>engine block</u> and the wheels stop rounds: get behind the engine, low by the wheel. And with an RPG about, get away from it: the car burns.</td></tr></table>
<ul>
<li><b>Signs your cover is going:</b> chips and dust flying off the wall, holes appearing, the parapet getting lower. Do not wait for the hole: <span class="hl">move before it opens</span>, with suppressing fire covering the move.</li>
<li>Do not stay too long in one place: the enemy keeps shooting where he last saw you.</li>
<li>A building corner is better than a free-standing wall: more mass, and a way out on the other side.</li>
<li>It works the other way too: a militiaman behind a door, sheet metal or a mud wall <b>is not in cover</b>. Suppress through the wall and the SAW will open it up.</li>
<li>The AK's 7.62 goes through more than our 5.56. What covers you from one rifle may not cover you from his.</li></ul>`],
  ['5. Técnicos y RPG', `{sk:tech}<ul>
<li>Primero, <b>las armas que más bajas causan</b>: la ametralladora pesada del <b>técnico</b> y el <b>RPG</b>. Todo lo demás espera.</li>
<li class="red">En cuanto veas uno: pelotón más cercano y <b>Atacar</b> (A) tocándolo, o <b>Suprimir</b> (S) sobre su posición. Al técnico, primero el artillero.</li>
<li>Una 12,7 mm atraviesa un coche de lado a lado y los muros finos. Frente a un técnico, busca esquina de piedra o sal de su calle.</li></ul>{sk:rpg}<ul>
<li>El tirador de RPG tiene que <u>salir al descubierto y arrodillarse</u> para apuntar. Son dos o tres segundos: ahí se le tumba. El rebufo levanta una nube que marca de dónde vino el disparo.</li>
<li>Apuntan a los helicópteros, sobre todo a la cola. Azoteas y bocacalles cerca de un Black Hawk se vigilan siempre.</li></ul>{sk:flank}<ul>
<li><b>Fuego y maniobra</b>: nadie avanza sin que otro esté disparando. Una escuadra <b>fija</b> al enemigo con supresión y la otra lo <b>rodea</b> por la calle de al lado.</li>
<li>Ganar el tiroteo es conseguir que agachen la cabeza: mucho fuego al principio, sostenido después.</li>
<li>Se recarga <u>a cubierto</u>, nunca en mitad de una calle abierta.</li></ul>`,
`{sk:tech}<ul>
<li>First, <b>the weapons that cause most casualties</b>: the <b>technical</b>'s heavy machine gun and the <b>RPG</b>. Everything else waits.</li>
<li class="red">As soon as you see one: nearest squad and <b>Attack</b> (A) by tapping it, or <b>Suppress</b> (S) its position. On a technical, the gunner first.</li>
<li>A 12.7 mm goes through a car from side to side, and through thin walls. Facing a technical, find a stone corner or get out of its street.</li></ul>{sk:rpg}<ul>
<li>An RPG gunner has to <u>step into the open and kneel</u> to aim. That is two or three seconds: drop him then. The backblast throws up a cloud that marks where the shot came from.</li>
<li>They aim at the helicopters, mostly at the tail. Rooftops and side streets near a Black Hawk are always watched.</li></ul>{sk:flank}<ul>
<li><b>Fire and manoeuvre</b>: nobody moves unless somebody else is shooting. One team <b>fixes</b> the enemy with suppression while the other goes <b>round</b> by the next street.</li>
<li>Winning the firefight means making them keep their heads down: heavy fire at first, sustained afterwards.</li>
<li>Reload <u>behind cover</u>, never in the middle of an open street.</li></ul>`],
  ['6. Los heridos', `{sk:cas}<ul>
<li class="red"><b>La mejor medicina es la superioridad de fuego.</b> Curar bajo fuego directo es perder a dos hombres en vez de a uno: primero suprime o cúbrete.</li>
<li>Nadie atiende a los heridos si no lo mandas tú. Selecciona al pelotón y pulsa <b>Atender heridos</b> {btn:oMed} (H).</li>
<li>El pelotón se para. El <b>sanitario</b> va a por el caído más cercano y los demás se agachan mirando hacia fuera: <u>seguridad en 360°</u>.</li>
<li>Con sanitario, un caído se levanta en unos 5 segundos y luego cura a los que caminan heridos. Sin sanitario, el compañero más cercano tarda el doble, y cada uno se venda como puede.</li>
<li>Cuando el sanitario avisa por radio <i>«Heridos atendidos»</i>, la orden se acaba sola.</li>
<li>Un herido recién levantado sigue tocado: no lo pongas en cabeza.</li>
<li>Un caído no se deja nunca. Para salir de la zona hay que llevarlos a todos.</li></ul>`,
`{sk:cas}<ul>
<li class="red"><b>The best medicine is fire superiority.</b> Treating under direct fire loses you two men instead of one: suppress or take cover first.</li>
<li>Nobody treats the wounded unless you order it. Select the squad and press <b>Treat wounded</b> {btn:oMed} (H).</li>
<li>The squad stops. The <b>medic</b> goes to the nearest man down while the rest crouch facing out: <u>all-round security</u>.</li>
<li>With a medic a downed man is back up in about 5 seconds, then the walking wounded are patched up. Without one, the nearest man takes twice as long and each dresses his own wounds.</li>
<li>When the medic radios <i>"Wounded seen to"</i>, the order ends by itself.</li>
<li>A man just back on his feet is still hurt: do not put him on point.</li>
<li>A man down is never left. To leave the area you take everyone with you.</li></ul>`],
  ['7. Apoyo aéreo', `{sk:lb}<ul>
<li><b>Apoyo</b> {btn:oSupport} → <b>Little Bird</b> {btn:oLB} (L): toca donde empieza la pasada y arrastra hasta donde acaba.</li>
<li class="red">La pasada va <b>paralela a tu línea</b>, nunca hacia tus hombres ni por encima de ellos. Los casquillos y los rebotes también caen.</li>
<li>El piloto necesita saber dónde estáis: de día, <b>paneles naranjas</b>; de noche, luces infrarrojas. Si tienes al enemigo a menos de una manzana, es <u>«peligro cerca»</u>: aparta primero a los tuyos.</li>
<li>Las pasadas son pocas (el número del botón) y tardan en volver: <span class="hl">guárdalas para técnicos, nidos de ametralladora y multitudes.</span></li>
<li>Un helicóptero quieto y bajo es un blanco para el RPG. Mantén limpias las azoteas cerca de ellos.</li></ul>`,
`{sk:lb}<ul>
<li><b>Support</b> {btn:oSupport} → <b>Little Bird</b> {btn:oLB} (L): tap where the run starts and drag to where it ends.</li>
<li class="red">The run goes <b>parallel to your line</b>, never toward your men or over them. Brass and ricochets come down too.</li>
<li>The pilot needs to know where you are: by day, <b>orange panels</b>; by night, infrared lights. If the enemy is less than a block away it is <u>"danger close"</u>: pull your men back first.</li>
<li>Runs are few (the number on the button) and take a while to come back: <span class="hl">save them for technicals, gun nests and crowds.</span></li>
<li>A helicopter low and still is a target for an RPG. Keep the rooftops near them clear.</li></ul>`],
  ['8. De noche', `{sk:night}<ul>
<li>Aquel 3 de octubre salimos a media tarde para una misión de una hora. <b>Los Rangers dejaron las gafas de visión nocturna en la base</b>, igual que buena parte del agua: pesaban y no iban a hacer falta. Se hizo de noche y seguíamos allí.</li>
<li>Sin visores, los Rangers tuvieron que tirar de la <b>linterna acodada</b> del correaje. Alumbraba unos 15 m… pero quien quedaba en el haz se veía a media calle de distancia, para nosotros y para ellos. <span class="hl">Aprendimos a encenderla lo justo</span> y a no pararnos nunca en mitad de una calle abierta con ella puesta.</li>
<li>Los <b>Delta sí llevaban sus visores</b> {btn:oNV} (V). Veían a oscuras hasta unos 50 m y se acercaban muchísimo a la milicia sin que los descubrieran. Por eso iban en cabeza. Lo que nos enseñaron: el visor ve por un tubo estrecho, los lados quedan ciegos, y alguien tiene que cubrírselos.</li>
<li>La milicia no tenía visores: <b>solo veía lo que iluminaba una luz</b>. La noche era nuestra… mientras no la encendiéramos nosotros.</li>
<li>Con las <b>bengalas</b> {btn:oFlr} (F) aprendimos rápido: la que cae sobre el enemigo o detrás de él lo recorta contra las paredes; la que cae sobre ti te deja a la vista de todo el barrio.</li>
<li class="red">Y una bengala cerca deslumbró los visores de los Delta. Desde entonces, ninguna encima de ellos.</li></ul>`,
`{sk:night}<ul>
<li>That 3 October we went out in mid-afternoon on a one-hour mission. <b>The Rangers left their night vision goggles at the base</b>, like a good part of the water: they were heavy and would not be needed. Night fell and we were still there.</li>
<li>Without goggles, the Rangers had to rely on the <b>angle-head torch</b> on their webbing. It lit about 15 m… but whoever stood in the beam could be seen half a street away, by us and by them. <span class="hl">We learned to switch it on only when we had to</span>, and never to halt in the middle of an open street with it lit.</li>
<li>The <b>Delta did have their NVGs</b> {btn:oNV} (V). They saw in the dark out to about 50 m and got very close to the militia without being spotted. That is why they went first. What they taught us: the goggle sees down a narrow tube, the sides are blind, and someone has to cover them.</li>
<li>The militia had no night sights: <b>they only saw what a light showed them</b>. The night was ours… as long as we did not light it up ourselves.</li>
<li>With the <b>flares</b> {btn:oFlr} (F) we learned fast: one that comes down over the enemy or behind him outlines him against the walls; one that comes down over you puts you on show to the whole neighbourhood.</li>
<li class="red">And a flare close by whited out the Delta goggles. After that, never one on top of them.</li></ul>`],
  ['9. Los botones', `<table class="keys">
<tr><td>{btn:oChain}</td><td><b>Ruta</b> (M) — toca el suelo punto a punto</td></tr>
<tr><td>{btn:oForm}</td><td><b>Formación</b> (G) — columna, punta de flecha, escalonada, escalón</td></tr>
<tr><td>{btn:oAtk}</td><td><b>Atacar</b> (A) — toca un enemigo visible</td></tr>
<tr><td>{btn:oSup}</td><td><b>Suprimir</b> (S) — toca una zona o un enemigo</td></tr>
<tr><td>{btn:oCov}</td><td><b>Cubrirse</b> (C) — al parapeto más cercano</td></tr>
<tr><td>{btn:oStop}</td><td><b>Alto</b> (X) — se paran donde están</td></tr>
<tr><td>{btn:oMed}</td><td><b>Atender heridos</b> (H)</td></tr>
<tr><td>{btn:oSupport}</td><td><b>Apoyo</b>: Little Bird (L), bengala (F), visores (V)</td></tr>
<tr><td>{btn:bPause}</td><td><b>Pausa táctica</b> (Espacio)</td></tr>
<tr><td>{btn:bAuto}</td><td><b>Pausa automática</b> con contacto, bajas y objetivos</td></tr>
<tr><td>{btn:cMap}</td><td><b>Mapa táctico</b> (N)</td></tr>
<tr><td>{btn:cRotL}{btn:cRotR}</td><td><b>Girar</b> la cámara (Q / E)</td></tr>
<tr><td>{btn:cZin}{btn:cZout}</td><td><b>Zoom</b> (rueda o pellizco)</td></tr></table>
<ul class="tight"><li><b>Seleccionar</b>: toca a un soldado o su ficha. <b>Doble toque</b> en un soldado (o T): toda la unidad.</li>
<li><b>Mover</b>: con la unidad seleccionada, toca el suelo. Arrastra el dedo por el mapa para desplazar la vista.</li>
<li><b>Mantén pulsado</b> el suelo o un enemigo: menú con todas las órdenes para ese punto.</li><li>Esc: menú de pausa.</li></ul>`,
`<table class="keys">
<tr><td>{btn:oChain}</td><td><b>Route</b> (M): tap the ground point by point</td></tr>
<tr><td>{btn:oForm}</td><td><b>Formation</b> (G): column, arrowhead, staggered, echelon</td></tr>
<tr><td>{btn:oAtk}</td><td><b>Attack</b> (A): tap a visible enemy</td></tr>
<tr><td>{btn:oSup}</td><td><b>Suppress</b> (S): tap an area or an enemy</td></tr>
<tr><td>{btn:oCov}</td><td><b>Take cover</b> (C): the nearest cover</td></tr>
<tr><td>{btn:oStop}</td><td><b>Halt</b> (X): they stop where they are</td></tr>
<tr><td>{btn:oMed}</td><td><b>Treat wounded</b> (H)</td></tr>
<tr><td>{btn:oSupport}</td><td><b>Support</b>: Little Bird (L), flare (F), NVGs (V)</td></tr>
<tr><td>{btn:bPause}</td><td><b>Tactical pause</b> (Space)</td></tr>
<tr><td>{btn:bAuto}</td><td><b>Auto-pause</b> on contact, casualties and objectives</td></tr>
<tr><td>{btn:cMap}</td><td><b>Tactical map</b> (N)</td></tr>
<tr><td>{btn:cRotL}{btn:cRotR}</td><td><b>Rotate</b> the camera (Q / E)</td></tr>
<tr><td>{btn:cZin}{btn:cZout}</td><td><b>Zoom</b> (wheel or pinch)</td></tr></table>
<ul class="tight"><li><b>Select</b>: tap a soldier or his card. <b>Double-tap</b> a soldier (or T): the whole unit.</li>
<li><b>Move</b>: with the unit selected, tap the ground. Drag across the map to pan the view.</li>
<li><b>Press and hold</b> the ground or an enemy: a menu with every order for that spot.</li><li>Esc: pause menu.</li></ul>`],
  ['10. Cómo se portan tus hombres', `<ul>
<li>Disparan solos a lo que ven. Tú eliges el blanco cuando importa: técnicos, RPG, tiradores en las azoteas.</li>
<li>Parados junto a una pared, <b>se pegan a ella y se asoman</b> por la esquina.</li>
<li>Con fuego encima <b>se agachan</b>; con demasiado, <b>se clavan</b> al suelo y hay que sacarlos.</li>
<li>Al llegar a un punto, <b>la mitad se arrodilla</b> y la otra mitad vigila.</li>
<li>Corren y <b>se cansan</b>. Un hombre agotado no obedece las órdenes de mover hasta recuperar el aliento.</li>
<li>Los heridos <b>cojean</b>; los caídos llaman al sanitario y se quedan esperando: <span class="hl">te toca a ti mandar a alguien.</span></li>
<li>El jefe de equipo lleva la <b>radio</b>: todo lo importante sale por ella (abajo). Léela.</li>
<li>Las fichas de abajo muestran a cada hombre: vida, munición y lo que está haciendo.</li></ul>`,
`<ul>
<li>They fire on their own at what they see. You pick the target when it matters: technicals, RPGs, rooftop shooters.</li>
<li>Standing by a wall, <b>they stack up against it and look</b> round the corner.</li>
<li>With fire coming in <b>they crouch</b>; with too much, <b>they get pinned</b> and you have to get them out.</li>
<li>On reaching a point, <b>half of them kneel</b> and the other half keep watch.</li>
<li>They run and <b>they tire</b>. An exhausted man will not obey move orders until he gets his breath back.</li>
<li>The wounded <b>limp</b>; the men down call for the medic and wait: <span class="hl">it is up to you to send someone.</span></li>
<li>The team leader carries the <b>radio</b>: everything important comes over it (bottom). Read it.</li>
<li>The cards at the bottom show each man: health, ammunition and what he is doing.</li></ul>`],
  ['Lo que no viene en ningún manual', `<ul>
<li>Despacio es seguro, y seguro es rápido.</li>
<li>Si no sabes qué hacer: pausa, cúbrete, mira el mapa.</li>
<li>El enemigo conoce estas calles. Tú solo conoces la ruta. <b>No la dejes.</b></li>
<li>Los civiles no son el enemigo. Mira antes de disparar.</li>
<li>Agua, munición y otro cargador de reserva. Siempre.</li></ul>
<p class="sign">Que nadie se quede atrás.<br><span>— Sgto., Cía. B · 3 de octubre de 1993</span></p>`,
`<ul>
<li>Slow is smooth, and smooth is fast.</li>
<li>When in doubt: pause, take cover, check the map.</li>
<li>The enemy knows these streets. You only know the route. <b>Do not leave it.</b></li>
<li>Civilians are not the enemy. Look before you shoot.</li>
<li>Water, ammunition and a spare magazine. Always.</li></ul>
<p class="sign">Leave no man behind.<br><span>— Sgt., B Co. · 3 October 1993</span></p>`]
];

const HAZE = 0xbcb19b;
const REFL = [];   // helicopter groups that show in the water (reflFrame)
const scene = new T.Scene(); scene.autoUpdate = false;   // matrices are refreshed once per frame by hand, just before drawing
scene.background = new T.Color(HAZE);
scene.fog = new T.Fog(HAZE, 92, 150);
const cam = new T.OrthographicCamera(-1,1,1,-1,0.1,400);
const hemi = new T.HemisphereLight(0xfff4e2, 0x8a7a5e, 0.72); scene.add(hemi);
const sun = new T.DirectionalLight(0xffd9a2, 1.0);
sun.position.set(W/2 - 30, 40, H/2 + 24);
sun.target.position.set(W/2, 0, H/2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left:-50, right:50, top:50, bottom:-50, near:1, far:160 });
sun.shadow.bias = -0.0016; sun.shadow.camera.layers.mask = 3;   // the shadow camera also sees layer 1 (zones off screen)
scene.add(sun); scene.add(sun.target);

const geoC = {}, matC = {};
const bgeo = (w,h,d) => { const k = w+'|'+h+'|'+d; return geoC[k] || (geoC[k] = new T.BoxGeometry(w,h,d)); };
const lmat = c => matC[c] || (matC[c] = new T.MeshPhongMaterial({ color:c, specular:0x000000, shininess:1 }));
function box(w,h,d,col,x,y,z,parent,shadow){
  const m = new T.Mesh(bgeo(w,h,d), lmat(col)); m.position.set(x,y,z);
  if (shadow !== false){ m.castShadow = true; m.receiveShadow = true; }
  parent.add(m); return m;
}
const UBOX = new T.BoxGeometry(1,1,1), UCYL = new T.CylinderGeometry(.5,.5,1,8);
