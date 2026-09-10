-- =========================================================================
-- Ney Heritage — seed data
-- Run after schema.sql. Idempotent: re-running upserts on slug/id.
--
-- Monastery facts (districts, traditions, founding years, coordinates) are
-- drawn from public sources (Wikipedia); founding years for the smaller
-- village monasteries are approximate.
-- Images are freely licensed Wikimedia Commons files, verified reachable at
-- authoring time.
--
-- Removed in the data-integrity pass: hotel tariffs, star ratings, room
-- counts and TSD rates; 220 synthetic bookings; the TSD remittance ledger;
-- and the fabricated tourism_stats row. None of it was sourced.
-- =========================================================================

insert into public.monasteries
  (slug, name, district, tradition, established_year, description, lat, lng, image,
   source_id, source_url, verified_at, confidence)
values
  ('rumtek', 'Rumtek Monastery', 'Gangtok', 'Karma Kagyu', 1966,
   'Seat-in-exile of the Karmapa and the largest monastery in Sikkim. The golden stupa holds the relics of the 16th Karmapa; the shedra behind the main hall still trains monks in the old curriculum.',
   27.2886, 88.5615,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Rumtek_Monastery_04.jpg/1920px-Rumtek_Monastery_04.jpg'),
  ('enchey', 'Enchey Monastery', 'Gangtok', 'Nyingma', 1909,
   'Gangtok''s own gompa, built on a site blessed by the flying lama Druptob Karpo. Its Cham masked dances each January pull the whole city uphill.',
   27.3358, 88.6193,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Enchey_Monastery_02.jpg/1920px-Enchey_Monastery_02.jpg'),
  ('lingdum', 'Lingdum (Ranka) Monastery', 'Gangtok', 'Zurmang Kagyu', 1999,
   'A vast, cinematic courtyard monastery east of Gangtok — the youngest major gompa in Sikkim and a favourite film location, with a resident community of young monks.',
   27.3320, 88.6800,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Lingdum_Monastery_%28also_Ranka_Lingdum_or_Pal_Zurmang_Kagyud_Monastery%29.jpg/1920px-Lingdum_Monastery_%28also_Ranka_Lingdum_or_Pal_Zurmang_Kagyud_Monastery%29.jpg'),
  ('tsuklakhang', 'Tsuklakhang Palace Monastery', 'Gangtok', 'Nyingma', 1898,
   'The royal chapel of the Chogyals inside the palace compound — coronations, royal weddings and the Kagyed dance all happened under this roof.',
   27.3255, 88.6122,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Tsuklakhang_Monastery.jpg/1920px-Tsuklakhang_Monastery.jpg'),
  ('phodong', 'Phodong Monastery', 'Mangan', 'Karma Kagyu', 1740,
   'One of the six great monasteries of Sikkim, rebuilt after the 19th-century earthquakes; its early-morning prayers over the Teesta valley are worth the drive north.',
   27.4130, 88.5836,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Phodong_monastery_-_north_sikkim.jpg/1920px-Phodong_monastery_-_north_sikkim.jpg'),
  ('phensang', 'Phensang Monastery', 'Mangan', 'Nyingma', 1721,
   'A ridge-top Nyingma seat north of Gangtok with one of the largest monk communities in Sikkim; its two-day festival before Losoong opens the winter season.',
   27.4300, 88.6000,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Phensong_Monastery.jpg/1920px-Phensong_Monastery.jpg'),
  ('lachen', 'Lachen Monastery', 'Mangan', 'Nyingma', 1858,
   'The gompa of the Lachenpas, perched above the village that guards the road to Gurudongmar. The Lachen Gomchen remains one of Sikkim''s most revered teachers.',
   27.7167, 88.5500,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Lachen_Monastery_Gompa.jpg/1920px-Lachen_Monastery_Gompa.jpg'),
  ('lachung', 'Lachung Monastery', 'Mangan', 'Nyingma', 1880,
   'A weathered valley monastery among apple orchards on the way to Yumthang — famous for its water-driven prayer wheels and Losoong masked dances.',
   27.6890, 88.7430,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Lachung_Monastery_at_Lachung_Valley_in_North_Sikkim%2C_India_02.jpg/1920px-Lachung_Monastery_at_Lachung_Valley_in_North_Sikkim%2C_India_02.jpg'),
  ('pemayangtse', 'Pemayangtse Monastery', 'Gyalshing', 'Nyingma', 1705,
   'The "Perfect Sublime Lotus", head of all Nyingma monasteries in Sikkim. Upstairs stands the Zangdok Palri — a seven-tiered wooden model of Guru Rinpoche''s heavenly palace, carved by a single lama over five years.',
   27.3050, 88.2515,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Pemayangtse_Monastery_Sikkim_India.jpg/1920px-Pemayangtse_Monastery_Sikkim_India.jpg'),
  ('sanga-choeling', 'Sanga Choeling Monastery', 'Gyalshing', 'Nyingma', 1697,
   'The second-oldest gompa in Sikkim, reached by a forty-minute forest climb from Pelling — the new Chenrezig statue and skywalk share its ridge.',
   27.2960, 88.2260,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Full_view_of_Sanga-Choeling_Monastery.jpg/1920px-Full_view_of_Sanga-Choeling_Monastery.jpg'),
  ('dubdi', 'Dubdi Monastery', 'Gyalshing', 'Nyingma', 1701,
   'The oldest monastery in Sikkim, "the Hermit''s Cell", above Yuksom where the first Chogyal was crowned. The walk up through cardamom forest is half the pilgrimage.',
   27.3660, 88.2300,
   'https://upload.wikimedia.org/wikipedia/commons/3/3d/Yuksom_Dubdi_Gompa4.jpg'),
  ('tashiding', 'Tashiding Monastery', 'Gyalshing', 'Nyingma', 1717,
   'The holiest hill in Sikkim, ringed by mani walls and chortens. One sight of the Thongwa Rangdol stupa is said to cleanse a lifetime of sin; the Bhumchu water ceremony each spring foretells the year ahead.',
   27.3080, 88.2980,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Mani_stone_slabs_outside_Tashiding_Monastery.jpg/1920px-Mani_stone_slabs_outside_Tashiding_Monastery.jpg'),
  ('ralang', 'Ralang Monastery', 'Namchi', 'Kagyu', 1768,
   'Twin monasteries near Ravangla — the old gompa of 1768 and the vast new Palchen Choeling complex — whose Pang Lhabsol dances honour Kanchenjunga itself.',
   27.3286, 88.3300,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Ralang_monastery_sikkim_1.jpg/1920px-Ralang_monastery_sikkim_1.jpg'),
  ('kewzing', 'Kewzing Monastery', 'Namchi', 'Kagyu', 1875,
   'A quiet village gompa in Sikkim''s best-known homestay country — monks here still farm, and visitors are welcome at morning puja.',
   27.2600, 88.3100,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kewzing_Monastery_at_Kewzing_Village%2C_South_Sikkim_01.jpg/1920px-Kewzing_Monastery_at_Kewzing_Village%2C_South_Sikkim_01.jpg'),
  ('rinchenpong', 'Rinchenpong Monastery', 'Soreng', 'Nyingma', 1730,
   'Third-oldest in Sikkim, home to a rare Ati Buddha statue in union pose — and a balcony view of Kanchenjunga that empties the village every clear dawn.',
   27.2360, 88.1900,
   'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/View_of_rinchenpong_monastery_entry.JPG/1920px-View_of_rinchenpong_monastery_entry.JPG')
on conflict (slug) do update set
  name = excluded.name,
  district = excluded.district,
  tradition = excluded.tradition,
  established_year = excluded.established_year,
  description = excluded.description,
  lat = excluded.lat,
  lng = excluded.lng,
  image = excluded.image;
