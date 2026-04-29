-- ================================================================
-- SEED: equipos rivales + personas + jugadores  ·  Temporada 2025-2026
-- SAC ya está en BD — este script inserta los 6 equipos rivales.
-- Generado desde data/J*/  ·  2026-04-29
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. EQUIPOS  (6 rivales)
-- ----------------------------------------------------------------
INSERT INTO equipos (short_name, nombre, temporada) VALUES
  ('CBN', 'CB Nord', '2025-2026'),
  ('CBP', 'CB Porto Cristo', '2025-2026'),
  ('CLU', 'Club Basquet Pla de na Tesa', '2025-2026'),
  ('CON', 'Construccions Jam Soller', '2025-2026'),
  ('RES', 'Restaurante Las Tres Bolas', '2025-2026'),
  ('SCD', 'SCD Hispania', '2025-2026');

-- ----------------------------------------------------------------
-- 2. PERSONAS  (~" + Object.values(equiposMap).reduce((s,e)=>s+Object.keys(e.players).length,0) + " jugadores)
-- ----------------------------------------------------------------
INSERT INTO personas (nombre, apellidos) VALUES
  ('Lucas', 'Martinez Teijeiro'),
  ('Felipe', 'Aristoteles Quetglas Cottrell'),
  ('Christian', 'Ochogavia Cobano'),
  ('Daniel', 'Alvarez Caldentey'),
  ('Yostin', 'Molina Cortes'),
  ('Marc', 'Tomas Juan Gomez'),
  ('Aram', 'López-morato Martin'),
  ('Miquel', 'Juan Gomez'),
  ('Adrià', 'Molina Buades'),
  ('Jose', 'Cuevas Bennasar'),
  ('Pau', 'Colombram Llabres'),
  ('Mariano', 'Socias Saura'),
  ('Jordi', 'Gaya Truyols'),
  ('Tomeu', 'Mariano Caldes Serra'),
  ('Vuk', 'Toskovic'),
  ('Pere', 'Lluis Rosselló Pastor'),
  ('Jaume', 'Valeri Rullan Juan'),
  ('Pere', 'Nebot Pont'),
  ('Andres', 'Izquierdo Calero'),
  ('Jordi', 'Bernabe Ventura'),
  ('Juan', 'Garcia Campillo'),
  ('Miquel', 'Llodra Vives'),
  ('Juan', 'Carlos Parera Parera'),
  ('Francesc', 'Pascual Suasi'),
  ('Francesc', 'Xavier Fernandez Aguilo'),
  ('Jordi', 'Juan Parera Parera'),
  ('Juan', 'Jaume Beltran'),
  ('Stephan', 'Spermann'),
  ('Roberto', 'Moreno Garcia'),
  ('Enric', 'Sánchez Cabot'),
  ('Hector', 'Del Salvador Pardo'),
  ('Alex', 'Olivares Barcelo'),
  ('Bartomeu', 'Mayans Maimo'),
  ('David', 'Morales Hernandez'),
  ('Antonio', 'Bonet Trujillo'),
  ('Esteban', 'Santin Caimari'),
  ('Volodymyr', 'Tokhtamyshev'),
  ('Tarek', 'El Omari Koudia'),
  ('Christian', 'Pons Perez'),
  ('Albert', 'Palau Canals'),
  ('Dirk', 'Rodriguez Piet'),
  ('Joan', 'Jimenez Rigo'),
  ('Cristian', 'Andres Osorio Gonzalez'),
  ('Gabriel', 'Quetglas Bover'),
  ('Albert', 'Muñoz Calafell'),
  ('Francisco', 'Mestre Gonzalez'),
  ('Martin', 'Nicolas Estivill Lopez'),
  ('Francesc', 'Lorente Estaras'),
  ('Guillem', 'Amengual Oliver'),
  ('Ismael', 'Ramis Ozcariz'),
  ('Nazareno', 'Roggerone'),
  ('Linares', 'Colomar Daniel'),
  ('Miquel', 'Estarellas Hernandez'),
  ('Daniel', 'Rodríguez Burgos'),
  ('David', 'Aloy Casajuana'),
  ('Daniel', 'Linares Colomar'),
  ('Juan', 'Ripoll Simarro'),
  ('Marc', 'Paris Ramon'),
  ('Juan', 'Oliver Pomar'),
  ('Jordi', 'Mendez Puigserver'),
  ('Damia', 'Bonet Balaguer'),
  ('Marc', 'Cadiz Aycart'),
  ('Marco', 'Sastre Pereira'),
  ('Antoni', 'Bonet Balaguer'),
  ('Nicolás', 'Maura Vargas'),
  ('Macia', 'Mas Canyelles'),
  ('M.p.c.', ''),
  ('Iván', 'Jerez Fuentes'),
  ('Hector', 'Cobo Justo'),
  ('Alvaro', 'Gonzalez Simo'),
  ('Quimey', 'Vargas Rodriguez Barreiro'),
  ('Roberto', 'Marc Giordano Mendez'),
  ('Carlos', 'Fra Martinez'),
  ('José', 'Miguel Galván Fullana'),
  ('Miquel', 'Corbacho Sintes'),
  ('Alejandro', 'Exposito Gener'),
  ('Juan', 'Díaz Ferrando'),
  ('Joan', 'Guiscafre Jimenez'),
  ('Oscar', 'Lago Piñeiro'),
  ('Marti', 'Fullana Miquel'),
  ('Aaron', 'Garcia Millan'),
  ('Jorge', 'Dueñas Oliver'),
  ('Adrian', 'Fernandez Pollock'),
  ('Toheeb', 'Olagunju Adeniyi'),
  ('Ivan', 'Marco Peralta'),
  ('Juan', 'Luis Peixoto Font'),
  ('Lluis', 'Belluga Rosselló'),
  ('D.m.m.', ''),
  ('Raúl', 'Garcia Orcera'),
  ('Andreu', 'Sorell Pou');

-- ----------------------------------------------------------------
-- 3. JUGADORES
-- ----------------------------------------------------------------
INSERT INTO jugadores (persona_id, equipo_id, dorsal)
  SELECT p.id, e.id, '1' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Lucas') AND LOWER(p.apellidos)=LOWER('Martinez Teijeiro') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '7' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Felipe') AND LOWER(p.apellidos)=LOWER('Aristoteles Quetglas Cottrell') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '14' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Christian') AND LOWER(p.apellidos)=LOWER('Ochogavia Cobano') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '15' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Daniel') AND LOWER(p.apellidos)=LOWER('Alvarez Caldentey') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '26' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Yostin') AND LOWER(p.apellidos)=LOWER('Molina Cortes') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '69' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Marc') AND LOWER(p.apellidos)=LOWER('Tomas Juan Gomez') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '87' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Aram') AND LOWER(p.apellidos)=LOWER('López-morato Martin') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '8' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Miquel') AND LOWER(p.apellidos)=LOWER('Juan Gomez') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '19' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Adrià') AND LOWER(p.apellidos)=LOWER('Molina Buades') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '32' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Jose') AND LOWER(p.apellidos)=LOWER('Cuevas Bennasar') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '5' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Pau') AND LOWER(p.apellidos)=LOWER('Colombram Llabres') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '6' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Mariano') AND LOWER(p.apellidos)=LOWER('Socias Saura') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '16' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Jordi') AND LOWER(p.apellidos)=LOWER('Gaya Truyols') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '67' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Tomeu') AND LOWER(p.apellidos)=LOWER('Mariano Caldes Serra') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '26' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Vuk') AND LOWER(p.apellidos)=LOWER('Toskovic') AND e.short_name='CBN'
UNION ALL
  SELECT p.id, e.id, '1' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Pere') AND LOWER(p.apellidos)=LOWER('Lluis Rosselló Pastor') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '2' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Jaume') AND LOWER(p.apellidos)=LOWER('Valeri Rullan Juan') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '3' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Pere') AND LOWER(p.apellidos)=LOWER('Nebot Pont') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '6' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Andres') AND LOWER(p.apellidos)=LOWER('Izquierdo Calero') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '7' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Jordi') AND LOWER(p.apellidos)=LOWER('Bernabe Ventura') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '10' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Juan') AND LOWER(p.apellidos)=LOWER('Garcia Campillo') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '11' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Miquel') AND LOWER(p.apellidos)=LOWER('Llodra Vives') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '13' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Juan') AND LOWER(p.apellidos)=LOWER('Carlos Parera Parera') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '21' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Francesc') AND LOWER(p.apellidos)=LOWER('Pascual Suasi') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '22' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Francesc') AND LOWER(p.apellidos)=LOWER('Xavier Fernandez Aguilo') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '00' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Jordi') AND LOWER(p.apellidos)=LOWER('Juan Parera Parera') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '12' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Juan') AND LOWER(p.apellidos)=LOWER('Jaume Beltran') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '4' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Stephan') AND LOWER(p.apellidos)=LOWER('Spermann') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '28' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Roberto') AND LOWER(p.apellidos)=LOWER('Moreno Garcia') AND e.short_name='CBP'
UNION ALL
  SELECT p.id, e.id, '0' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Enric') AND LOWER(p.apellidos)=LOWER('Sánchez Cabot') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '4' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Hector') AND LOWER(p.apellidos)=LOWER('Del Salvador Pardo') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '5' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Alex') AND LOWER(p.apellidos)=LOWER('Olivares Barcelo') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '8' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Bartomeu') AND LOWER(p.apellidos)=LOWER('Mayans Maimo') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '10' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('David') AND LOWER(p.apellidos)=LOWER('Morales Hernandez') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '12' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Antonio') AND LOWER(p.apellidos)=LOWER('Bonet Trujillo') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '13' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Esteban') AND LOWER(p.apellidos)=LOWER('Santin Caimari') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '14' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Volodymyr') AND LOWER(p.apellidos)=LOWER('Tokhtamyshev') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '15' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Tarek') AND LOWER(p.apellidos)=LOWER('El Omari Koudia') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '17' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Christian') AND LOWER(p.apellidos)=LOWER('Pons Perez') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '37' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Albert') AND LOWER(p.apellidos)=LOWER('Palau Canals') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '91' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Dirk') AND LOWER(p.apellidos)=LOWER('Rodriguez Piet') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '23' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Joan') AND LOWER(p.apellidos)=LOWER('Jimenez Rigo') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '6' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Cristian') AND LOWER(p.apellidos)=LOWER('Andres Osorio Gonzalez') AND e.short_name='CLU'
UNION ALL
  SELECT p.id, e.id, '1' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Gabriel') AND LOWER(p.apellidos)=LOWER('Quetglas Bover') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '2' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Albert') AND LOWER(p.apellidos)=LOWER('Muñoz Calafell') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '3' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Francisco') AND LOWER(p.apellidos)=LOWER('Mestre Gonzalez') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '4' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Martin') AND LOWER(p.apellidos)=LOWER('Nicolas Estivill Lopez') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '7' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Francesc') AND LOWER(p.apellidos)=LOWER('Lorente Estaras') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '10' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Guillem') AND LOWER(p.apellidos)=LOWER('Amengual Oliver') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '14' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Ismael') AND LOWER(p.apellidos)=LOWER('Ramis Ozcariz') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '44' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Nazareno') AND LOWER(p.apellidos)=LOWER('Roggerone') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '75' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Linares') AND LOWER(p.apellidos)=LOWER('Colomar Daniel') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '99' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Miquel') AND LOWER(p.apellidos)=LOWER('Estarellas Hernandez') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '8' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Daniel') AND LOWER(p.apellidos)=LOWER('Rodríguez Burgos') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '24' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('David') AND LOWER(p.apellidos)=LOWER('Aloy Casajuana') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '75' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Daniel') AND LOWER(p.apellidos)=LOWER('Linares Colomar') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '96' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Juan') AND LOWER(p.apellidos)=LOWER('Ripoll Simarro') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '7' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Marc') AND LOWER(p.apellidos)=LOWER('Paris Ramon') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '13' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Juan') AND LOWER(p.apellidos)=LOWER('Oliver Pomar') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '19' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Jordi') AND LOWER(p.apellidos)=LOWER('Mendez Puigserver') AND e.short_name='CON'
UNION ALL
  SELECT p.id, e.id, '2' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Damia') AND LOWER(p.apellidos)=LOWER('Bonet Balaguer') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '3' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Marc') AND LOWER(p.apellidos)=LOWER('Cadiz Aycart') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '8' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Marco') AND LOWER(p.apellidos)=LOWER('Sastre Pereira') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '9' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Antoni') AND LOWER(p.apellidos)=LOWER('Bonet Balaguer') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '12' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Nicolás') AND LOWER(p.apellidos)=LOWER('Maura Vargas') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '13' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Macia') AND LOWER(p.apellidos)=LOWER('Mas Canyelles') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '15' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('M.p.c.') AND LOWER(p.apellidos)=LOWER('') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '20' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Iván') AND LOWER(p.apellidos)=LOWER('Jerez Fuentes') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '23' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Hector') AND LOWER(p.apellidos)=LOWER('Cobo Justo') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '35' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Alvaro') AND LOWER(p.apellidos)=LOWER('Gonzalez Simo') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '89' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Quimey') AND LOWER(p.apellidos)=LOWER('Vargas Rodriguez Barreiro') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '91' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Roberto') AND LOWER(p.apellidos)=LOWER('Marc Giordano Mendez') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '18' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Carlos') AND LOWER(p.apellidos)=LOWER('Fra Martinez') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '2' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('José') AND LOWER(p.apellidos)=LOWER('Miguel Galván Fullana') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '33' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Miquel') AND LOWER(p.apellidos)=LOWER('Corbacho Sintes') AND e.short_name='RES'
UNION ALL
  SELECT p.id, e.id, '1' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Alejandro') AND LOWER(p.apellidos)=LOWER('Exposito Gener') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '4' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Juan') AND LOWER(p.apellidos)=LOWER('Díaz Ferrando') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '8' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Joan') AND LOWER(p.apellidos)=LOWER('Guiscafre Jimenez') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '10' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Oscar') AND LOWER(p.apellidos)=LOWER('Lago Piñeiro') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '12' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Marti') AND LOWER(p.apellidos)=LOWER('Fullana Miquel') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '16' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Aaron') AND LOWER(p.apellidos)=LOWER('Garcia Millan') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '49' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Jorge') AND LOWER(p.apellidos)=LOWER('Dueñas Oliver') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '77' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Adrian') AND LOWER(p.apellidos)=LOWER('Fernandez Pollock') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '00' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Toheeb') AND LOWER(p.apellidos)=LOWER('Olagunju Adeniyi') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '2' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Ivan') AND LOWER(p.apellidos)=LOWER('Marco Peralta') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '17' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Juan') AND LOWER(p.apellidos)=LOWER('Luis Peixoto Font') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '21' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Lluis') AND LOWER(p.apellidos)=LOWER('Belluga Rosselló') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '52' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('D.m.m.') AND LOWER(p.apellidos)=LOWER('') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '20' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Raúl') AND LOWER(p.apellidos)=LOWER('Garcia Orcera') AND e.short_name='SCD'
UNION ALL
  SELECT p.id, e.id, '34' FROM personas p, equipos e WHERE LOWER(p.nombre)=LOWER('Andreu') AND LOWER(p.apellidos)=LOWER('Sorell Pou') AND e.short_name='SCD';

COMMIT;
