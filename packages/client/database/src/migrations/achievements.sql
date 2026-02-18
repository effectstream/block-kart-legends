-- Achievement definitions for Block Kart Legends

INSERT INTO achievements (id, name, description, icon_url) VALUES
  -- Win streak achievements
  ('win_1_race', 'Green Light Rookie', 'Win your very first race.', 'https://game2.paimastudios.com//win_1_race.png'),
  -- ('win_2_races', 'Back-to-Back', 'Win 2 races in total.', 'https://game2.paimastudios.com/win_2_races.png'),
  ('win_5_races', 'Podium Regular', 'Win 5 races in total.', 'https://game2.paimastudios.com/win_5_races.png'),
  ('win_10_races', 'Track Champion', 'Win 10 races in total.', 'https://game2.paimastudios.com/win_10_races.png'),
  ('win_20_races', 'Turbo Legend', 'Win 20 races in total.', 'https://game2.paimastudios.com/win_20_races.png'),
  ('win_30_races', 'Nitro Hero', 'Win 30 races in total.', 'https://game2.paimastudios.com/win_30_races.png'),
  ('win_40_races', 'Speed Icon', 'Win 40 races in total.', 'https://game2.paimastudios.com/win_40_races.png'),
  ('win_100_races', 'Circuit Overlord', 'Win 100 races in total.', 'https://game2.paimastudios.com/win_100_races.png'),
  ('win_250_races', 'Kart Immortal', 'Win 250 races in total.', 'https://game2.paimastudios.com/win_250_races.png'),

  -- Lose streak achievements
  ('lose_1_race', 'First Crash', 'Lose your first race. It happens.', 'https://game2.paimastudios.com//lose_1_race.png'),
  ('lose_5_races', 'Learning the Lines', 'Lose 5 races in total.', 'https://game2.paimastudios.com/lose_5_races.png'),
  ('lose_10_races', 'Spinout Specialist', 'Lose 10 races in total.', 'https://game2.paimastudios.com/lose_10_races.png'),
  ('lose_50_races', 'Crash Test Driver', 'Lose 50 races in total.', 'https://game2.paimastudios.com/lose_50_races.png'),
  ('lose_100_races', 'Unbreakable Spirit', 'Lose 100 races in total and keep racing.', 'https://game2.paimastudios.com/lose_100_races.png'),

  -- Surface-specific wins
  ('win_10_dirt', 'Dust Devil', 'Win 10 races on a DIRT track.', 'https://game2.paimastudios.com/win_10_dirt.png'),
  ('win_10_ice', 'Ice Drifter', 'Win 10 races on an ICE track.', 'https://game2.paimastudios.com/win_10_ice.png'),
  ('win_10_asphalt', 'Asphalt Apex', 'Win 10 races on an ASPHALT track.', 'https://game2.paimastudios.com/win_10_asphalt.png');

