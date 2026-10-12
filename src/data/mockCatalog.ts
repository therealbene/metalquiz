import type { Album } from '../domain/types';
import { generateCover } from './coverArt';

type Style = 'occult' | 'fantasy' | 'gore' | 'cosmic' | 'industrial' | 'landscape' | 'mono' | 'beast' | 'war';

/** [artist, album, year, subgenre, popularity 0-100, art style] */
type Row = [string, string, number, string, number, Style];

// Metadata is real. Artwork is generated (see coverArt.ts) because real covers are copyrighted
// and are only available through the Discogs API with credentials.
const ROWS: Row[] = [
  // NWOBHM / Heavy Metal
  ['Iron Maiden', 'The Number of the Beast', 1982, 'NWOBHM', 98, 'occult'],
  ['Iron Maiden', 'Powerslave', 1984, 'NWOBHM', 92, 'landscape'],
  ['Judas Priest', 'British Steel', 1980, 'Heavy Metal', 90, 'industrial'],
  ['Judas Priest', 'Screaming for Vengeance', 1982, 'Heavy Metal', 82, 'beast'],
  ['Motörhead', 'Ace of Spades', 1980, 'Speed Metal', 95, 'war'],
  ['Saxon', 'Wheels of Steel', 1980, 'NWOBHM', 58, 'industrial'],
  ['Diamond Head', 'Lightning to the Nations', 1980, 'NWOBHM', 38, 'mono'],
  ['Venom', 'Black Metal', 1982, 'Black Metal', 70, 'occult'],
  ['Black Sabbath', 'Paranoid', 1970, 'Heavy Metal', 97, 'mono'],
  ['Black Sabbath', 'Master of Reality', 1971, 'Doom Metal', 85, 'mono'],
  ['Black Sabbath', 'Heaven and Hell', 1980, 'Heavy Metal', 80, 'fantasy'],
  ['Dio', 'Holy Diver', 1983, 'Heavy Metal', 86, 'fantasy'],
  ['Ozzy Osbourne', 'Blizzard of Ozz', 1980, 'Heavy Metal', 80, 'occult'],
  ['Rainbow', 'Rising', 1976, 'Heavy Metal', 60, 'fantasy'],
  ['Accept', 'Balls to the Wall', 1983, 'Heavy Metal', 55, 'industrial'],
  ['Accept', 'Restless and Wild', 1982, 'Heavy Metal', 40, 'war'],
  ['Mercyful Fate', 'Melissa', 1983, 'Heavy Metal', 42, 'occult'],
  ['Mercyful Fate', "Don't Break the Oath", 1984, 'Heavy Metal', 44, 'occult'],
  ['King Diamond', 'Abigail', 1987, 'Heavy Metal', 50, 'occult'],
  ['W.A.S.P.', 'The Last Command', 1985, 'Heavy Metal', 25, 'war'],
  ['Manilla Road', 'Crystal Logic', 1983, 'Heavy Metal', 18, 'fantasy'],
  // Thrash
  ['Metallica', 'Master of Puppets', 1986, 'Thrash Metal', 99, 'landscape'],
  ['Metallica', 'Ride the Lightning', 1984, 'Thrash Metal', 91, 'industrial'],
  ['Metallica', 'Kill ’Em All', 1983, 'Thrash Metal', 88, 'mono'],
  ['Metallica', '...And Justice for All', 1988, 'Thrash Metal', 85, 'mono'],
  ['Megadeth', 'Rust in Peace', 1990, 'Thrash Metal', 85, 'cosmic'],
  ['Megadeth', 'Peace Sells... But Who’s Buying?', 1986, 'Thrash Metal', 80, 'war'],
  ['Megadeth', 'Killing Is My Business... And Business Is Good!', 1985, 'Thrash Metal', 52, 'gore'],
  ['Slayer', 'Reign in Blood', 1986, 'Thrash Metal', 90, 'gore'],
  ['Slayer', 'Seasons in the Abyss', 1990, 'Thrash Metal', 70, 'landscape'],
  ['Slayer', 'South of Heaven', 1988, 'Thrash Metal', 70, 'occult'],
  ['Anthrax', 'Among the Living', 1987, 'Thrash Metal', 70, 'war'],
  ['Anthrax', 'Spreading the Disease', 1985, 'Thrash Metal', 48, 'beast'],
  ['Exodus', 'Bonded by Blood', 1985, 'Thrash Metal', 55, 'gore'],
  ['Testament', 'The Legacy', 1987, 'Thrash Metal', 45, 'occult'],
  ['Testament', 'The New Order', 1988, 'Thrash Metal', 45, 'cosmic'],
  ['Kreator', 'Pleasure to Kill', 1986, 'Thrash Metal', 50, 'gore'],
  ['Kreator', 'Extreme Aggression', 1989, 'Thrash Metal', 40, 'war'],
  ['Sodom', 'Agent Orange', 1989, 'Thrash Metal', 40, 'war'],
  ['Destruction', 'Infernal Overkill', 1985, 'Thrash Metal', 40, 'beast'],
  ['Overkill', 'The Years of Decay', 1989, 'Thrash Metal', 35, 'cosmic'],
  ['Death Angel', 'The Ultra-Violence', 1987, 'Thrash Metal', 35, 'gore'],
  ['Sepultura', 'Beneath the Remains', 1989, 'Thrash Metal', 50, 'landscape'],
  ['Sepultura', 'Arise', 1991, 'Thrash Metal', 55, 'beast'],
  ['Sepultura', 'Chaos A.D.', 1993, 'Groove Metal', 60, 'mono'],
  ['Pantera', 'Cowboys from Hell', 1990, 'Groove Metal', 72, 'industrial'],
  ['Pantera', 'Vulgar Display of Power', 1992, 'Groove Metal', 78, 'mono'],
  ['Celtic Frost', 'To Mega Therion', 1985, 'Black Metal', 45, 'beast'],
  ['Possessed', 'Seven Churches', 1985, 'Death Metal', 35, 'occult'],
  // Death
  ['Death', 'Scream Bloody Gore', 1987, 'Death Metal', 50, 'gore'],
  ['Death', 'Human', 1991, 'Death Metal', 60, 'cosmic'],
  ['Death', 'Symbolic', 1995, 'Death Metal', 45, 'cosmic'],
  ['Morbid Angel', 'Altars of Madness', 1989, 'Death Metal', 60, 'occult'],
  ['Morbid Angel', 'Covenant', 1993, 'Death Metal', 48, 'occult'],
  ['Cannibal Corpse', 'Tomb of the Mutilated', 1992, 'Death Metal', 60, 'gore'],
  ['Cannibal Corpse', 'Butchered at Birth', 1991, 'Death Metal', 50, 'gore'],
  ['Obituary', 'Cause of Death', 1990, 'Death Metal', 45, 'gore'],
  ['Carcass', 'Heartwork', 1993, 'Melodic Death Metal', 50, 'gore'],
  ['At the Gates', 'Slaughter of the Soul', 1995, 'Melodic Death Metal', 55, 'mono'],
  ['Entombed', 'Left Hand Path', 1990, 'Death Metal', 45, 'gore'],
  ['Suffocation', 'Effigy of the Forgotten', 1991, 'Death Metal', 35, 'gore'],
  ['Dismember', 'Like an Ever Flowing Stream', 1991, 'Death Metal', 35, 'gore'],
  ['Immolation', 'Dawn of Possession', 1991, 'Death Metal', 20, 'occult'],
  ['Pestilence', 'Consuming Impulse', 1989, 'Death Metal', 20, 'cosmic'],
  ['Bolt Thrower', '...For Victory', 1994, 'Death Metal', 25, 'war'],
  ['Gorguts', 'Obscura', 1998, 'Technical Death Metal', 20, 'cosmic'],
  ['Nile', 'Annihilation of the Wicked', 2005, 'Technical Death Metal', 22, 'landscape'],
  ['Napalm Death', 'Scum', 1987, 'Grindcore', 45, 'mono'],
  ['Napalm Death', 'From Enslavement to Obliteration', 1988, 'Grindcore', 32, 'gore'],
  ['Carcass', 'Reek of Putrefaction', 1988, 'Goregrind', 40, 'gore'],
  ['Terrorizer', 'World Downfall', 1989, 'Grindcore', 30, 'war'],
  ['Repulsion', 'Horrified', 1989, 'Grindcore', 22, 'gore'],
  ['Brutal Truth', 'Extreme Conditions Demand Extreme Responses', 1992, 'Grindcore', 18, 'industrial'],
  ['Nasum', 'Inhale/Exhale', 1998, 'Grindcore', 16, 'mono'],
  ['Pig Destroyer', 'Prowler in the Yard', 2001, 'Grindcore', 24, 'gore'],
  ['Rotten Sound', 'Under Pressure', 2002, 'Grindcore', 14, 'industrial'],
  ['Discharge', 'Hear Nothing See Nothing Say Nothing', 1982, 'Crust', 30, 'war'],
  // Sludge
  ['Eyehategod', 'Dopesick', 1996, 'Sludge Metal', 30, 'gore'],
  ['Melvins', 'Houdini', 1993, 'Sludge Metal', 32, 'mono'],
  ['Crowbar', 'Crowbar', 1993, 'Sludge Metal', 22, 'landscape'],
  ['Acid Bath', 'When the Kite String Pops', 1994, 'Sludge Metal', 28, 'gore'],
  ['Neurosis', 'Through Silver in Blood', 1996, 'Sludge Metal', 30, 'landscape'],
  ['Mastodon', 'Remission', 2002, 'Sludge Metal', 38, 'beast'],
  ['Kylesa', 'Spiral Shadows', 2010, 'Sludge Metal', 16, 'cosmic'],
  ['Corrosion of Conformity', 'Deliverance', 1994, 'Sludge Metal', 26, 'landscape'],
  ['Down', 'NOLA', 1995, 'Sludge Metal', 35, 'landscape'],
  ['High on Fire', 'Blessed Black Wings', 2005, 'Sludge Metal', 26, 'beast'],
  ['Cult of Luna', 'Salvation', 2004, 'Sludge Metal', 18, 'cosmic'],
  ['Isis', 'Oceanic', 2002, 'Sludge Metal', 28, 'cosmic'],
  ['Amon Amarth', 'Twilight of the Thunder God', 2008, 'Melodic Death Metal', 32, 'fantasy'],
  // Black
  ['Mayhem', 'De Mysteriis Dom Sathanas', 1994, 'Black Metal', 66, 'occult'],
  ['Darkthrone', 'Transilvanian Hunger', 1994, 'Black Metal', 55, 'mono'],
  ['Darkthrone', 'A Blaze in the Northern Sky', 1992, 'Black Metal', 45, 'landscape'],
  ['Emperor', 'In the Nightside Eclipse', 1994, 'Black Metal', 55, 'landscape'],
  ['Immortal', 'At the Heart of Winter', 1999, 'Black Metal', 40, 'landscape'],
  ['Bathory', 'Under the Sign of the Black Mark', 1987, 'Black Metal', 40, 'occult'],
  ['Bathory', 'Hammerheart', 1990, 'Viking Metal', 40, 'fantasy'],
  ['Dimmu Borgir', 'Enthrone Darkness Triumphant', 1997, 'Symphonic Black Metal', 45, 'fantasy'],
  ['Cradle of Filth', 'Dusk and Her Embrace', 1996, 'Symphonic Black Metal', 30, 'gore'],
  ['Gorgoroth', 'Pentagram', 1994, 'Black Metal', 24, 'occult'],
  ['Watain', 'Lawless Darkness', 2010, 'Black Metal', 28, 'occult'],
  ['Behemoth', 'The Satanist', 2014, 'Blackened Death Metal', 32, 'occult'],
  ['Ghost', 'Opus Eponymous', 2010, 'Heavy Metal', 30, 'occult'],
  // Doom
  ['Candlemass', 'Epicus Doomicus Metallicus', 1986, 'Doom Metal', 45, 'fantasy'],
  ['Cathedral', 'Forest of Equilibrium', 1991, 'Doom Metal', 32, 'gore'],
  ['My Dying Bride', 'Turn Loose the Swans', 1993, 'Doom Metal', 32, 'mono'],
  ['Electric Wizard', 'Dopethrone', 2000, 'Doom Metal', 40, 'landscape'],
  ['Sleep', 'Dopesmoker', 2003, 'Stoner Metal', 35, 'landscape'],
  ['Paradise Lost', 'Gothic', 1991, 'Doom Metal', 35, 'mono'],
  ['Saint Vitus', 'Born Too Late', 1986, 'Doom Metal', 25, 'occult'],
  ['Trouble', 'Psalm 9', 1984, 'Doom Metal', 25, 'occult'],
  ['Witchfinder General', 'Death Penalty', 1982, 'Doom Metal', 20, 'occult'],
  ['Solitude Aeturnus', 'Beyond the Crimson Horizon', 1992, 'Doom Metal', 12, 'fantasy'],
  ['Pentagram', 'Relentless', 1985, 'Doom Metal', 20, 'mono'],
  // Power / Speed / Traditional
  ['Helloween', 'Keeper of the Seven Keys, Part I', 1987, 'Power Metal', 50, 'fantasy'],
  ['Helloween', 'Keeper of the Seven Keys, Part II', 1988, 'Power Metal', 55, 'fantasy'],
  ['Blind Guardian', 'Imaginations from the Other Side', 1995, 'Power Metal', 40, 'fantasy'],
  ['Blind Guardian', 'Nightfall in Middle-Earth', 1998, 'Power Metal', 40, 'fantasy'],
  ['Stratovarius', 'Visions', 1997, 'Power Metal', 30, 'cosmic'],
  ['Gamma Ray', 'Land of the Free', 1995, 'Power Metal', 30, 'fantasy'],
  ['Rhapsody', 'Symphony of Enchanted Lands', 1998, 'Symphonic Power Metal', 30, 'fantasy'],
  ['Manowar', 'Kings of Metal', 1988, 'Heavy Metal', 50, 'war'],
  ['Manowar', 'Hail to England', 1984, 'Heavy Metal', 30, 'war'],
  ['Sonata Arctica', 'Ecliptica', 1999, 'Power Metal', 30, 'fantasy'],
  ['HammerFall', 'Glory to the Brave', 1997, 'Power Metal', 30, 'fantasy'],
  ['Iced Earth', 'Night of the Stormrider', 1991, 'Power Metal', 20, 'landscape'],
  ['Savatage', 'Hall of the Mountain King', 1987, 'Heavy Metal', 25, 'fantasy'],
  ['Running Wild', 'Death or Glory', 1989, 'Power Metal', 20, 'war'],
  // Progressive
  ['Dream Theater', 'Images and Words', 1992, 'Progressive Metal', 65, 'fantasy'],
  ['Dream Theater', 'Metropolis Pt. 2: Scenes from a Memory', 1999, 'Progressive Metal', 50, 'cosmic'],
  ['Queensrÿche', 'Operation: Mindcrime', 1988, 'Progressive Metal', 55, 'industrial'],
  ['Fates Warning', 'Awaken the Guardian', 1986, 'Progressive Metal', 20, 'fantasy'],
  ['Fates Warning', 'Perfect Symmetry', 1989, 'Progressive Metal', 20, 'cosmic'],
  ['Opeth', 'Blackwater Park', 2001, 'Progressive Death Metal', 55, 'landscape'],
  ['Opeth', 'Still Life', 1999, 'Progressive Death Metal', 30, 'landscape'],
  ['Mastodon', 'Leviathan', 2004, 'Progressive Metal', 45, 'landscape'],
  ['Mastodon', 'Crack the Skye', 2009, 'Progressive Metal', 40, 'cosmic'],
  ['Gojira', 'From Mars to Sirius', 2005, 'Progressive Metal', 35, 'landscape'],
  ['Meshuggah', 'Destroy Erase Improve', 1995, 'Technical Thrash Metal', 30, 'cosmic'],
  ['Cynic', 'Focus', 1993, 'Technical Death Metal', 25, 'cosmic'],
  ['Symphony X', 'The Divine Wings of Tragedy', 1997, 'Progressive Metal', 25, 'fantasy'],
  ['Pain of Salvation', 'The Perfect Element, Part I', 2000, 'Progressive Metal', 15, 'cosmic'],
];

function slug(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function buildMockCatalog(): Album[] {
  return ROWS.map(([artist, albumTitle, year, subgenre, popularityScore, visualStyle]) => {
    const id = `mock-${slug(artist)}-${slug(albumTitle)}`;
    const cover = generateCover({ id, artist, albumTitle, subgenre, visualStyle });
    return {
      id,
      artist,
      albumTitle,
      year,
      genre: 'Metal',
      subgenre,
      coverImageUrl: cover.url,
      avoidRegions: cover.avoidRegions,
      // Mock links go to a Discogs search, since the mock data carries no real Discogs ids.
      discogsUrl: `https://www.discogs.com/search/?q=${encodeURIComponent(`${artist} ${albumTitle}`)}&type=master`,
      popularityScore,
      // Famous albums are easy to recognise; a small stable offset avoids a perfectly linear curve.
      difficultyScore: Math.max(0, Math.min(100, Math.round(100 - popularityScore * 0.95 + (year % 7) - 3))),
      visualStyle,
    };
  });
}
