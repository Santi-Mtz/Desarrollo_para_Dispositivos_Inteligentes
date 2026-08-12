BEGIN;

INSERT INTO tipos_arma (nombre)
VALUES
  ('Espada recta'),
  ('Katana'),
  ('Colosal'),
  ('Baston'),
  ('Alabarda'),
  ('Espadon curvo'),
  ('Arco')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO tipos_arma (nombre)
VALUES
  ('Daga'),
  ('Lanza'),
  ('Espadon')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Lordsworn''s Straight Sword', id, 2, 3.5, 'STR/DES', 'Espada versatil para inicio de partida.'
FROM tipos_arma
WHERE nombre = 'Espada recta'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Uchigatana', id, 3, 5.5, 'DES', 'Katana con sangrado, util para builds agiles.'
FROM tipos_arma
WHERE nombre = 'Katana'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Greatsword', id, 4, 23.0, 'STR', 'Arma colosal para alto dano y stagger.'
FROM tipos_arma
WHERE nombre = 'Colosal'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Moonveil', id, 5, 6.5, 'DES/INT', 'Katana magica con arte de arma de largo alcance.'
FROM tipos_arma
WHERE nombre = 'Katana'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Nagakiba', id, 4, 7.0, 'DES', 'Katana larga con excelente alcance para sangrado.'
FROM tipos_arma
WHERE nombre = 'Katana'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Golden Halberd', id, 4, 13.5, 'STR/FE', 'Alabarda con alto daño y buff sagrado.'
FROM tipos_arma
WHERE nombre = 'Alabarda'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Bloodhound''s Fang', id, 4, 11.5, 'DES/STR', 'Espadon curvo con daño alto y excelente movilidad.'
FROM tipos_arma
WHERE nombre = 'Espadon curvo'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Meteorite Staff', id, 3, 4.0, 'INT', 'Baston ideal para inicio de build de hechizos.'
FROM tipos_arma
WHERE nombre = 'Baston'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Longbow', id, 2, 4.0, 'DES', 'Arco versatil para daño a distancia constante.'
FROM tipos_arma
WHERE nombre = 'Arco'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Claymore', id, 3, 9.0, 'STR/DES', 'Espadon equilibrado para builds de calidad.'
FROM tipos_arma
WHERE nombre = 'Colosal'
ON CONFLICT DO NOTHING;

INSERT INTO clases (nombre, enfoque, vigor, mente, resistencia, fuerza, destreza, inteligencia, fe, arcano, descripcion)
VALUES
  ('Vagabundo', 'Tanque cuerpo a cuerpo', 15, 10, 11, 14, 13, 9, 9, 7, 'Clase robusta con gran supervivencia y armas pesadas.'),
  ('Guerrero', 'Destreza y dual wield', 11, 12, 11, 10, 16, 10, 8, 9, 'Especialista en movilidad y ataques rapidos.'),
  ('Samurai', 'Sangrado y precision', 12, 11, 13, 12, 15, 9, 8, 8, 'Inicia con katana y excelente control de combate.'),
  ('Astrólogo', 'Hechizos de inteligencia', 9, 15, 9, 8, 12, 16, 7, 9, 'Clase orientada a daño magico a distancia.'),
  ('Confesor', 'Hibrido fe/combate', 10, 13, 10, 12, 12, 9, 14, 9, 'Combina milagros y combate cercano con versatilidad.'),
  ('Prisionero', 'Hibrido int/destreza', 11, 12, 11, 11, 14, 14, 6, 9, 'Buen inicio para builds rapidas con magia de apoyo.')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO armaduras (nombre, categoria, peso, defensa_fisica, defensa_magica, descripcion)
VALUES
  ('Set de Caballero Desterrado', 'Pesada', 41.6, 35.1, 28.3, 'Set de alta defensa fisica para tanque.'),
  ('Set de Carian Knight', 'Media', 25.1, 24.6, 29.4, 'Excelente resistencia magica con peso moderado.'),
  ('Set de Land of Reeds', 'Ligera', 19.8, 20.3, 17.9, 'Set samurai, agil y orientado a destreza.'),
  ('Set de Lionel', 'Pesada', 50.0, 39.8, 31.2, 'Armadura extremadamente resistente para frontliner.'),
  ('Set de Black Knife', 'Ligera', 21.8, 22.5, 19.6, 'Favorece sigilo y movilidad con buena defensa general.'),
  ('Set de Raging Wolf', 'Media', 24.2, 26.7, 22.9, 'Set balanceado para builds de calidad.')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO hechizos (nombre, costo_fp, requisitos, descripcion)
VALUES
  ('Glintstone Pebble', 7, 'INT 10', 'Hechizo basico de proyectil magico.'),
  ('Comet', 24, 'INT 52', 'Rayo magico de alto impacto.')
ON CONFLICT DO NOTHING;

INSERT INTO milagros (nombre, costo_fp, requisitos, descripcion)
VALUES
  ('Catch Flame', 10, 'FE 8', 'Llama rapida de corto alcance.'),
  ('Lightning Spear', 18, 'FE 17', 'Lanza relampago a media distancia.')
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Longsword', id, 2, 3.5, 'STR/DES', 'Espada recta equilibrada para cualquier build.'
FROM tipos_arma WHERE nombre = 'Espada recta'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Broadsword', id, 2, 4.0, 'STR', 'Mayor dano base que otras espadas rectas.'
FROM tipos_arma WHERE nombre = 'Espada recta'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Zweihander', id, 3, 15.5, 'STR/DES', 'Colosal con buen alcance y moveset flexible.'
FROM tipos_arma WHERE nombre = 'Colosal'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Giant-Crusher', id, 5, 26.5, 'STR', 'Martillo colosal de dano extremo.'
FROM tipos_arma WHERE nombre = 'Colosal'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Magma Wyrm''s Scalesword', id, 4, 15.0, 'STR/FE', 'Espadon curvo de fuego para build hibrida.'
FROM tipos_arma WHERE nombre = 'Espadon curvo'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Banished Knight''s Halberd', id, 3, 12.0, 'STR/DES', 'Alabarda confiable para calidad.'
FROM tipos_arma WHERE nombre = 'Alabarda'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Pike', id, 2, 7.5, 'DES', 'Lanza larga para control de distancia.'
FROM tipos_arma WHERE nombre = 'Lanza'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Cross-Naginata', id, 4, 8.0, 'DES/ARC', 'Lanza favorita en builds de hemorragia.'
FROM tipos_arma WHERE nombre = 'Lanza'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Reduvia', id, 4, 2.5, 'DES/ARC', 'Daga de sangrado con proyectil rapido.'
FROM tipos_arma WHERE nombre = 'Daga'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Misericorde', id, 2, 2.0, 'DES', 'Daga de criticos muy altos.'
FROM tipos_arma WHERE nombre = 'Daga'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Carian Glintstone Staff', id, 4, 4.5, 'INT', 'Baston para hechizos de espada cariana.'
FROM tipos_arma WHERE nombre = 'Baston'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Pulley Bow', id, 3, 6.0, 'DES', 'Arco con gran alcance para combates seguros.'
FROM tipos_arma WHERE nombre = 'Arco'
ON CONFLICT DO NOTHING;

INSERT INTO armas (nombre, tipo_id, rareza, peso, escalado, descripcion)
SELECT 'Knight''s Greatsword', id, 4, 10.0, 'STR/DES', 'Espadon con buen alcance y dano sostenido.'
FROM tipos_arma WHERE nombre = 'Espadon'
ON CONFLICT DO NOTHING;

INSERT INTO armaduras (nombre, categoria, peso, defensa_fisica, defensa_magica, descripcion)
VALUES
  ('Set de Tree Sentinel', 'Pesada', 45.0, 37.6, 30.1, 'Set pesado con gran defensa total.'),
  ('Set de Crucible Axe', 'Pesada', 38.9, 33.5, 27.8, 'Alta poise para melee agresivo.'),
  ('Set de Blaidd', 'Media', 28.8, 27.6, 23.5, 'Set versatil para calidad y agilidad media.'),
  ('Set de Royal Remains', 'Media', 25.9, 25.1, 20.2, 'Buen balance con estilo oscuro.'),
  ('Set de Fingerprint', 'Pesada', 47.4, 40.2, 29.0, 'Excelente para tank con escudo grande.'),
  ('Set de Veteran', 'Pesada', 46.9, 39.4, 28.1, 'Una de las mejores defensas fisicas del juego.'),
  ('Set de Fire Monk', 'Media', 30.7, 28.4, 22.7, 'Resistencia alta al fuego.'),
  ('Set de Raya Lucaria Soldier', 'Media', 24.5, 23.2, 24.0, 'Buen inicio para zonas magicas.'),
  ('Set de Knight', 'Media', 23.5, 24.1, 20.1, 'Set clasico equilibrado para early-mid game.'),
  ('Set de Radahn', 'Pesada', 41.0, 36.3, 26.0, 'Set de jefe con gran presencia y defensa.'),
  ('Set de Maliketh', 'Media', 26.3, 28.1, 22.4, 'Armadura agil con defensas estables.'),
  ('Set de Cleanrot', 'Media', 29.9, 30.0, 24.3, 'Excelente para resistencia a estados.'),
  ('Set de Zamor', 'Ligera', 18.2, 19.0, 16.8, 'Set ligero para alta movilidad.'),
  ('Set de Night Cavalry', 'Media', 27.6, 27.0, 21.6, 'Set oscuro con buen balance general.')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO hechizos (nombre, costo_fp, requisitos, descripcion)
VALUES
  ('Glintstone Arc', 10, 'INT 13', 'Corte magico en arco para grupos.'),
  ('Rock Sling', 18, 'INT 18', 'Lanza rocas que causan gran stagger.'),
  ('Carian Slicer', 4, 'INT 14', 'Espada magica rapida de corto alcance.'),
  ('Carian Greatsword', 16, 'INT 24', 'Corte amplio con espada magica gigante.'),
  ('Loretta''s Greatbow', 26, 'INT 26', 'Disparo magico de largo alcance.'),
  ('Swift Glintstone Shard', 5, 'INT 12', 'Proyectil rapido ideal para cast seguro.'),
  ('Magic Glintblade', 12, 'INT 14', 'Hoja flotante que ataca con retraso.'),
  ('Shattering Crystal', 38, 'INT 38', 'Explosion de cristales a corta distancia.'),
  ('Crystal Torrent', 14, 'INT 47', 'Canalizacion continua de proyectiles.'),
  ('Night Comet', 24, 'INT 38', 'Cometa dificil de esquivar para enemigos.'),
  ('Stars of Ruin', 32, 'INT 43', 'Multiples proyectiles guiados.'),
  ('Terra Magica', 20, 'INT 20', 'Zona que potencia dano de hechizos.'),
  ('Rennala''s Full Moon', 55, 'INT 70', 'Luna magica de alto impacto.'),
  ('Ranni''s Dark Moon', 62, 'INT 68', 'Luna oscura que reduce defensa magica.'),
  ('Founding Rain of Stars', 46, 'INT 52', 'Lluvia de estrellas sobre el objetivo.'),
  ('Cannon of Haima', 45, 'INT 25', 'Proyectil explosivo de gran area.'),
  ('Gavel of Haima', 37, 'INT 25', 'Martillazo magico contundente.'),
  ('Adula''s Moonblade', 26, 'INT 32', 'Espadazo helado con onda de frio.')
ON CONFLICT DO NOTHING;

INSERT INTO milagros (nombre, costo_fp, requisitos, descripcion)
VALUES
  ('Flame Sling', 11, 'FE 10', 'Bola de fuego de trayecto recto.'),
  ('Black Flame', 18, 'FE 20', 'Llama negra con dano porcentual.'),
  ('Scouring Black Flame', 27, 'FE 28', 'Barrido ancho de llama negra.'),
  ('Giantsflame Take Thee', 30, 'FE 30', 'Gran bola de fuego de gigante.'),
  ('Burn O Flame!', 34, 'FE 27', 'Columnas de fuego alrededor del lanzador.'),
  ('Flame, Grant Me Strength', 28, 'FE 15', 'Buff de dano fisico y fuego.'),
  ('Golden Vow', 47, 'FE 25', 'Buff general de ataque y defensa.'),
  ('Blessing of the Erdtree', 60, 'FE 38', 'Regeneracion de vida prolongada.'),
  ('Erdtree Heal', 65, 'FE 42', 'Curacion masiva para soporte.'),
  ('Dragonfire', 28, 'FE 15, ARC 12', 'Aliento de fuego de dragon.'),
  ('Ekzykes''s Decay', 48, 'FE 23, ARC 15', 'Nube de podredumbre escarlata.'),
  ('Frozen Lightning Spear', 36, 'FE 34', 'Relampago con acumulacion de escarcha.'),
  ('Ancient Dragons'' Lightning Strike', 32, 'FE 26', 'Tormenta de rayos en area.'),
  ('Fortissax''s Lightning Spear', 46, 'FE 46', 'Doble lanza de rayo antiguo.'),
  ('Bestial Sling', 7, 'FE 10', 'Lanza piedras rapidamente.'),
  ('Stone of Gurranq', 15, 'FE 13', 'Roca pesada de alto stagger.'),
  ('Pest Threads', 19, 'FE 11', 'Hilos que persiguen grandes objetivos.'),
  ('Wrath of Gold', 40, 'FE 32', 'Onda expansiva de empuje sagrado.')
ON CONFLICT DO NOTHING;

INSERT INTO talismanes (nombre, efecto, ubicacion)
VALUES
  ('Erdtree''s Favor', 'Aumenta vida, resistencia y carga maxima.', 'Fringefolk Hero''s Grave'),
  ('Radagon''s Scarseal', 'Aumenta fuerza pero incrementa dano recibido.', 'Fort Faroth'),
  ('Radagon''s Soreseal', 'Gran aumento de atributos fisicos con penalizacion defensiva.', 'Fort Faroth'),
  ('Marika''s Scarseal', 'Aumenta mente, inteligencia, fe y arcano con penalizacion.', 'Siofra River'),
  ('Marika''s Soreseal', 'Gran aumento de stats magicos con mas dano recibido.', 'Elphael'),
  ('Shard of Alexander', 'Potencia notablemente las habilidades de arma.', 'Final de quest de Alexander'),
  ('Warrior Jar Shard', 'Potencia moderada de habilidades de arma.', 'Quest de Alexander temprana'),
  ('Carian Filigreed Crest', 'Reduce costo FP de habilidades de arma.', 'Quest de Blaidd / Iji'),
  ('Radagon Icon', 'Aumenta velocidad de casteo.', 'Raya Lucaria Academy'),
  ('Graven-Mass Talisman', 'Incrementa dano de hechizos.', 'Consecrated Snowfield'),
  ('Flock''s Canvas Talisman', 'Incrementa dano de milagros.', 'Quest de Gowry'),
  ('Godfrey Icon', 'Potencia hechizos y skills cargados.', 'Golden Lineage Evergaol'),
  ('Green Turtle Talisman', 'Aumenta recuperacion de stamina.', 'Summonwater Village'),
  ('Bull-Goat''s Talisman', 'Aumenta poise.', 'Dragonbarrow Cave'),
  ('Dragoncrest Greatshield Talisman', 'Reduce gran parte del dano fisico recibido.', 'Elphael'),
  ('Magic Scorpion Charm', 'Aumenta dano magico pero reduce defensa.', 'Quest de Seluvis'),
  ('Fire Scorpion Charm', 'Aumenta dano de fuego pero reduce defensa.', 'Fort Laiedd'),
  ('Lightning Scorpion Charm', 'Aumenta dano de rayo pero reduce defensa.', 'Wyndham Catacombs'),
  ('Sacred Scorpion Charm', 'Aumenta dano sagrado pero reduce defensa.', 'Smoldering Church'),
  ('Ritual Sword Talisman', 'Aumenta ataque con vida al maximo.', 'Lux Ruins')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO builds (nombre, enfoque, nivel_recomendado, distribucion_puntos, descripcion)
VALUES
  ('Samurai Sangrado', 'DEX/ARC', 'Nivel 40-80', 'VIG 30, RES 20, DES 30, ARC 25', 'Usa Uchigatana o Nagakiba con acumulacion rapida de hemorragia.'),
  ('Katana Lunar', 'DEX/INT', 'Nivel 60-110', 'VIG 35, MND 20, RES 20, DES 30, INT 35', 'Build con Moonveil y hechizos de burst para PvE.'),
  ('Colosal Fuerza', 'STR/VIG', 'Nivel 70-120', 'VIG 45, RES 30, FUE 50, DES 18', 'Basada en Greatsword o Giant-Crusher con armadura pesada.'),
  ('Paladin Dorado', 'FE/STR', 'Nivel 60-120', 'VIG 40, MND 20, RES 25, FUE 35, FE 35', 'Golden Halberd, buffs de fe y alta supervivencia.'),
  ('Mago Carian', 'INT/MND', 'Nivel 50-120', 'VIG 35, MND 30, RES 18, DES 18, INT 45', 'Carian staff y hechizos de espada para combate hibrido.'),
  ('Hechicero Puro', 'INT/MND', 'Nivel 80-150', 'VIG 40, MND 38, RES 20, INT 70', 'Comet, Stars of Ruin y Terra Magica para dano maximo.'),
  ('Profeta de Llama', 'FE/MND', 'Nivel 50-110', 'VIG 35, MND 28, RES 18, FUE 18, FE 45', 'Flame Sling, Black Flame y buffs de fuego.'),
  ('Dragon Cult', 'FE/ARC', 'Nivel 80-140', 'VIG 40, MND 30, RES 22, FE 45, ARC 35', 'Incantaciones draconicas con dano elemental alto.'),
  ('Lanza de Escarcha', 'DEX/INT', 'Nivel 55-120', 'VIG 38, MND 18, RES 22, DES 35, INT 35', 'Cross-Naginata con soporte de magia de hielo.'),
  ('Arquero Tecnico', 'DEX/END', 'Nivel 40-90', 'VIG 30, MND 12, RES 28, FUE 16, DES 40', 'Longbow/Pulley Bow para control seguro a distancia.'),
  ('Asesino Critico', 'DEX/ARC', 'Nivel 35-90', 'VIG 28, MND 14, RES 20, DES 35, ARC 30', 'Reduvia y Misericorde con enfoque en criticos y bleed.'),
  ('Caballero Equilibrado', 'STR/DEX', 'Nivel 45-100', 'VIG 35, MND 14, RES 24, FUE 32, DES 32', 'Claymore o Knight''s Greatsword para juego estable.')
ON CONFLICT (nombre) DO UPDATE
SET
  enfoque = EXCLUDED.enfoque,
  nivel_recomendado = EXCLUDED.nivel_recomendado,
  distribucion_puntos = EXCLUDED.distribucion_puntos,
  descripcion = EXCLUDED.descripcion;

COMMIT;
