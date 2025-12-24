import * as React from 'react';
import { cn } from '@/utils/cn';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

// Emoji data with English and German keywords for search
interface EmojiData {
  emoji: string;
  keywords: string[];
}

const EMOJI_DATA: Record<string, EmojiData[]> = {
  'Frequently used': [
    { emoji: '⚡', keywords: ['blitz', 'lightning', 'schnell', 'fast', 'energie', 'energy', 'power'] },
    { emoji: '🌟', keywords: ['stern', 'star', 'glänzend', 'shiny', 'favorit', 'favorite'] },
    { emoji: '💫', keywords: ['stern', 'star', 'dizzy', 'schwindelig', 'magic', 'magie'] },
    { emoji: '❤️', keywords: ['herz', 'heart', 'liebe', 'love', 'rot', 'red'] },
    { emoji: '😊', keywords: ['lächeln', 'smile', 'glücklich', 'happy', 'freude', 'joy'] },
    { emoji: '🎉', keywords: ['party', 'feier', 'celebration', 'konfetti', 'confetti'] },
    { emoji: '✨', keywords: ['glitzer', 'sparkle', 'funkeln', 'shine', 'neu', 'new'] },
    { emoji: '🔥', keywords: ['feuer', 'fire', 'heiß', 'hot', 'flamme', 'flame', 'trending'] },
  ],
  'Smileys & People': [
    { emoji: '😀', keywords: ['grinsen', 'grin', 'lächeln', 'smile', 'glücklich', 'happy'] },
    { emoji: '😃', keywords: ['lächeln', 'smile', 'glücklich', 'happy', 'augen', 'eyes'] },
    { emoji: '😄', keywords: ['lachen', 'laugh', 'glücklich', 'happy', 'freude', 'joy'] },
    { emoji: '😁', keywords: ['grinsen', 'grin', 'lächeln', 'smile', 'zähne', 'teeth'] },
    { emoji: '😆', keywords: ['lachen', 'laugh', 'augen', 'closed eyes', 'lustig', 'funny'] },
    { emoji: '🥹', keywords: ['rührung', 'touched', 'tränen', 'tears', 'emotional'] },
    { emoji: '😅', keywords: ['schweiß', 'sweat', 'nervös', 'nervous', 'erleichtert', 'relieved'] },
    { emoji: '😂', keywords: ['lachen', 'laugh', 'tränen', 'tears', 'lustig', 'funny', 'lol'] },
    { emoji: '🤣', keywords: ['lachen', 'laugh', 'rollen', 'rolling', 'lustig', 'funny', 'rofl'] },
    { emoji: '🥲', keywords: ['lächeln', 'smile', 'träne', 'tear', 'traurig', 'sad', 'happy'] },
    { emoji: '😊', keywords: ['lächeln', 'smile', 'glücklich', 'happy', 'rot', 'blush'] },
    { emoji: '😇', keywords: ['engel', 'angel', 'heilig', 'holy', 'unschuldig', 'innocent'] },
    { emoji: '🙂', keywords: ['lächeln', 'smile', 'leicht', 'slight', 'okay'] },
    { emoji: '🙃', keywords: ['umgedreht', 'upside down', 'verkehrt', 'silly', 'sarkastisch', 'sarcastic'] },
    { emoji: '😉', keywords: ['zwinkern', 'wink', 'flirt', 'scherz', 'joke'] },
    { emoji: '😌', keywords: ['erleichtert', 'relieved', 'friedlich', 'peaceful', 'zufrieden', 'content'] },
    { emoji: '😍', keywords: ['herzen', 'hearts', 'verliebt', 'love', 'augen', 'eyes'] },
    { emoji: '🥰', keywords: ['herzen', 'hearts', 'liebe', 'love', 'zuneigung', 'affection'] },
    { emoji: '😘', keywords: ['kuss', 'kiss', 'herz', 'heart', 'liebe', 'love'] },
    { emoji: '😗', keywords: ['kuss', 'kiss', 'lippen', 'lips'] },
    { emoji: '😙', keywords: ['kuss', 'kiss', 'lächeln', 'smile'] },
    { emoji: '😚', keywords: ['kuss', 'kiss', 'augen', 'closed eyes'] },
    { emoji: '😋', keywords: ['lecker', 'yummy', 'zunge', 'tongue', 'essen', 'food'] },
    { emoji: '😛', keywords: ['zunge', 'tongue', 'frech', 'playful', 'albern', 'silly'] },
    { emoji: '😜', keywords: ['zwinkern', 'wink', 'zunge', 'tongue', 'verrückt', 'crazy'] },
    { emoji: '🤪', keywords: ['verrückt', 'crazy', 'albern', 'silly', 'wild'] },
    { emoji: '😝', keywords: ['zunge', 'tongue', 'augen', 'closed eyes', 'albern', 'silly'] },
    { emoji: '🤑', keywords: ['geld', 'money', 'dollar', 'reich', 'rich'] },
    { emoji: '🤗', keywords: ['umarmung', 'hug', 'umarmen', 'embrace', 'freundlich', 'friendly'] },
    { emoji: '🤭', keywords: ['kichern', 'giggle', 'hand', 'verlegen', 'shy'] },
    { emoji: '🫢', keywords: ['überrascht', 'surprised', 'hand', 'schock', 'shock'] },
    { emoji: '🤫', keywords: ['still', 'quiet', 'shush', 'geheim', 'secret'] },
    { emoji: '🤔', keywords: ['denken', 'think', 'nachdenken', 'thinking', 'hmm', 'überlegen'] },
    { emoji: '🫡', keywords: ['salut', 'salute', 'respekt', 'respect', 'ehre', 'honor'] },
    { emoji: '🤐', keywords: ['mund', 'mouth', 'reißverschluss', 'zipper', 'still', 'quiet'] },
    { emoji: '🤨', keywords: ['augenbraue', 'eyebrow', 'skeptisch', 'skeptical', 'zweifel', 'doubt'] },
    { emoji: '😐', keywords: ['neutral', 'ausdruckslos', 'expressionless', 'meh'] },
    { emoji: '😑', keywords: ['genervt', 'annoyed', 'ausdruckslos', 'expressionless'] },
    { emoji: '😶', keywords: ['still', 'quiet', 'kein mund', 'no mouth', 'sprachlos', 'speechless'] },
    { emoji: '🫥', keywords: ['unsichtbar', 'invisible', 'versteckt', 'hidden'] },
    { emoji: '😏', keywords: ['schmunzeln', 'smirk', 'selbstgefällig', 'smug'] },
    { emoji: '😒', keywords: ['genervt', 'annoyed', 'unzufrieden', 'unamused'] },
    { emoji: '🙄', keywords: ['augen rollen', 'eye roll', 'genervt', 'annoyed'] },
    { emoji: '😬', keywords: ['grimasse', 'grimace', 'awkward', 'peinlich'] },
    { emoji: '😮‍💨', keywords: ['seufzen', 'sigh', 'erschöpft', 'exhausted', 'erleichtert', 'relieved'] },
    { emoji: '🤥', keywords: ['lügen', 'lie', 'pinocchio', 'nase', 'nose'] },
    { emoji: '😔', keywords: ['traurig', 'sad', 'nachdenklich', 'pensive', 'enttäuscht', 'disappointed'] },
    { emoji: '😪', keywords: ['müde', 'sleepy', 'schläfrig', 'drowsy'] },
    { emoji: '🤤', keywords: ['sabbern', 'drool', 'lecker', 'yummy', 'hungrig', 'hungry'] },
    { emoji: '😴', keywords: ['schlafen', 'sleep', 'müde', 'tired', 'zzz'] },
    { emoji: '😷', keywords: ['maske', 'mask', 'krank', 'sick', 'erkältet', 'cold'] },
    { emoji: '🤒', keywords: ['krank', 'sick', 'fieber', 'fever', 'thermometer'] },
    { emoji: '🤕', keywords: ['verletzt', 'hurt', 'bandage', 'verband', 'kopf', 'head'] },
    { emoji: '🤢', keywords: ['übel', 'nauseous', 'krank', 'sick', 'grün', 'green'] },
  ],
  'Objects': [
    { emoji: '📚', keywords: ['bücher', 'books', 'lesen', 'read', 'bibliothek', 'library', 'studieren', 'study', 'wissen', 'knowledge'] },
    { emoji: '📖', keywords: ['buch', 'book', 'lesen', 'read', 'offen', 'open'] },
    { emoji: '📕', keywords: ['buch', 'book', 'rot', 'red', 'geschlossen', 'closed'] },
    { emoji: '📗', keywords: ['buch', 'book', 'grün', 'green'] },
    { emoji: '📘', keywords: ['buch', 'book', 'blau', 'blue'] },
    { emoji: '📙', keywords: ['buch', 'book', 'orange'] },
    { emoji: '📓', keywords: ['notizbuch', 'notebook', 'notizen', 'notes'] },
    { emoji: '📔', keywords: ['notizbuch', 'notebook', 'dekorativ', 'decorative'] },
    { emoji: '📒', keywords: ['buch', 'ledger', 'notizen', 'notes'] },
    { emoji: '📃', keywords: ['seite', 'page', 'dokument', 'document', 'curl'] },
    { emoji: '📜', keywords: ['schriftrolle', 'scroll', 'alt', 'old', 'papier', 'paper'] },
    { emoji: '📄', keywords: ['dokument', 'document', 'seite', 'page', 'datei', 'file'] },
    { emoji: '📰', keywords: ['zeitung', 'newspaper', 'nachrichten', 'news', 'artikel', 'article'] },
    { emoji: '🗞️', keywords: ['zeitung', 'newspaper', 'gerollt', 'rolled'] },
    { emoji: '📑', keywords: ['lesezeichen', 'bookmark', 'tabs', 'registerkarten'] },
    { emoji: '🔖', keywords: ['lesezeichen', 'bookmark', 'markierung', 'tag'] },
    { emoji: '💼', keywords: ['aktenkoffer', 'briefcase', 'arbeit', 'work', 'büro', 'office', 'geschäft', 'business'] },
    { emoji: '📁', keywords: ['ordner', 'folder', 'datei', 'file', 'verzeichnis', 'directory'] },
    { emoji: '📂', keywords: ['ordner', 'folder', 'offen', 'open', 'datei', 'file'] },
    { emoji: '🗂️', keywords: ['karteikarten', 'card index', 'ordner', 'dividers', 'organisation', 'organization'] },
    { emoji: '📋', keywords: ['zwischenablage', 'clipboard', 'liste', 'list', 'aufgaben', 'tasks'] },
    { emoji: '📇', keywords: ['karteikarten', 'card index', 'kontakte', 'contacts', 'adresse', 'address'] },
    { emoji: '📈', keywords: ['diagramm', 'chart', 'aufwärts', 'up', 'wachstum', 'growth', 'erfolg', 'success'] },
    { emoji: '📉', keywords: ['diagramm', 'chart', 'abwärts', 'down', 'rückgang', 'decline'] },
    { emoji: '📊', keywords: ['diagramm', 'chart', 'balken', 'bar', 'statistik', 'statistics', 'daten', 'data'] },
    { emoji: '📌', keywords: ['pin', 'stecknadel', 'markieren', 'mark', 'wichtig', 'important'] },
    { emoji: '📍', keywords: ['pin', 'standort', 'location', 'ort', 'place', 'karte', 'map'] },
    { emoji: '✂️', keywords: ['schere', 'scissors', 'schneiden', 'cut'] },
    { emoji: '🖊️', keywords: ['stift', 'pen', 'schreiben', 'write', 'kugelschreiber'] },
    { emoji: '✏️', keywords: ['bleistift', 'pencil', 'schreiben', 'write', 'zeichnen', 'draw'] },
    { emoji: '📝', keywords: ['notiz', 'memo', 'schreiben', 'write', 'notizen', 'notes', 'aufgabe', 'task'] },
    { emoji: '💻', keywords: ['laptop', 'computer', 'arbeit', 'work', 'programmieren', 'code'] },
    { emoji: '🖥️', keywords: ['computer', 'desktop', 'bildschirm', 'screen', 'monitor'] },
    { emoji: '🖨️', keywords: ['drucker', 'printer', 'drucken', 'print'] },
    { emoji: '⌨️', keywords: ['tastatur', 'keyboard', 'tippen', 'type'] },
    { emoji: '🖱️', keywords: ['maus', 'mouse', 'computer', 'klicken', 'click'] },
    { emoji: '💾', keywords: ['diskette', 'floppy', 'speichern', 'save', 'disk'] },
    { emoji: '💿', keywords: ['cd', 'disk', 'musik', 'music'] },
    { emoji: '📀', keywords: ['dvd', 'disk', 'film', 'movie'] },
    { emoji: '🔬', keywords: ['mikroskop', 'microscope', 'wissenschaft', 'science', 'forschung', 'research'] },
    { emoji: '🔭', keywords: ['teleskop', 'telescope', 'astronomie', 'astronomy', 'sterne', 'stars'] },
    { emoji: '📡', keywords: ['antenne', 'antenna', 'satellit', 'satellite', 'signal'] },
    { emoji: '💡', keywords: ['glühbirne', 'lightbulb', 'idee', 'idea', 'licht', 'light', 'inspiration'] },
    { emoji: '🔦', keywords: ['taschenlampe', 'flashlight', 'licht', 'light'] },
    { emoji: '🏮', keywords: ['laterne', 'lantern', 'rot', 'red', 'asiatisch', 'asian'] },
    { emoji: '📦', keywords: ['paket', 'package', 'box', 'schachtel', 'lieferung', 'delivery'] },
    { emoji: '🗃️', keywords: ['kartei', 'card file', 'archiv', 'archive', 'speicher', 'storage'] },
    { emoji: '🗄️', keywords: ['aktenschrank', 'filing cabinet', 'büro', 'office', 'speicher', 'storage'] },
  ],
  'Symbols': [
    { emoji: '❤️', keywords: ['herz', 'heart', 'liebe', 'love', 'rot', 'red'] },
    { emoji: '🧡', keywords: ['herz', 'heart', 'orange', 'liebe', 'love'] },
    { emoji: '💛', keywords: ['herz', 'heart', 'gelb', 'yellow', 'liebe', 'love'] },
    { emoji: '💚', keywords: ['herz', 'heart', 'grün', 'green', 'liebe', 'love'] },
    { emoji: '💙', keywords: ['herz', 'heart', 'blau', 'blue', 'liebe', 'love'] },
    { emoji: '💜', keywords: ['herz', 'heart', 'lila', 'purple', 'liebe', 'love'] },
    { emoji: '🖤', keywords: ['herz', 'heart', 'schwarz', 'black', 'liebe', 'love'] },
    { emoji: '🤍', keywords: ['herz', 'heart', 'weiß', 'white', 'liebe', 'love'] },
    { emoji: '🤎', keywords: ['herz', 'heart', 'braun', 'brown', 'liebe', 'love'] },
    { emoji: '💔', keywords: ['herz', 'heart', 'gebrochen', 'broken', 'traurig', 'sad'] },
    { emoji: '❣️', keywords: ['herz', 'heart', 'ausrufezeichen', 'exclamation'] },
    { emoji: '💕', keywords: ['herzen', 'hearts', 'zwei', 'two', 'liebe', 'love'] },
    { emoji: '💞', keywords: ['herzen', 'hearts', 'kreisen', 'revolving', 'liebe', 'love'] },
    { emoji: '💓', keywords: ['herz', 'heart', 'schlagen', 'beating', 'liebe', 'love'] },
    { emoji: '💗', keywords: ['herz', 'heart', 'wachsend', 'growing', 'liebe', 'love'] },
    { emoji: '💖', keywords: ['herz', 'heart', 'funkelnd', 'sparkling', 'liebe', 'love'] },
    { emoji: '💘', keywords: ['herz', 'heart', 'pfeil', 'arrow', 'amor', 'cupid'] },
    { emoji: '💝', keywords: ['herz', 'heart', 'schleife', 'ribbon', 'geschenk', 'gift'] },
    { emoji: '⭐', keywords: ['stern', 'star', 'favorit', 'favorite', 'bewertung', 'rating'] },
    { emoji: '🌟', keywords: ['stern', 'star', 'leuchtend', 'glowing', 'funkelnd', 'sparkling'] },
    { emoji: '✨', keywords: ['funkeln', 'sparkle', 'glitzer', 'glitter', 'magie', 'magic', 'neu', 'new'] },
    { emoji: '💫', keywords: ['stern', 'star', 'schwindelig', 'dizzy', 'shooting'] },
    { emoji: '⚡', keywords: ['blitz', 'lightning', 'schnell', 'fast', 'energie', 'energy'] },
    { emoji: '🔥', keywords: ['feuer', 'fire', 'heiß', 'hot', 'flamme', 'flame', 'beliebt', 'popular'] },
    { emoji: '💥', keywords: ['explosion', 'boom', 'knall', 'bang', 'crash'] },
    { emoji: '❄️', keywords: ['schneeflocke', 'snowflake', 'kalt', 'cold', 'winter'] },
    { emoji: '🌈', keywords: ['regenbogen', 'rainbow', 'farben', 'colors', 'bunt', 'colorful'] },
    { emoji: '☀️', keywords: ['sonne', 'sun', 'sonnig', 'sunny', 'warm', 'sommer', 'summer'] },
    { emoji: '🌙', keywords: ['mond', 'moon', 'nacht', 'night', 'schlafen', 'sleep'] },
    { emoji: '⭕', keywords: ['kreis', 'circle', 'ring', 'rund', 'round'] },
    { emoji: '✅', keywords: ['häkchen', 'check', 'erledigt', 'done', 'ja', 'yes', 'richtig', 'correct'] },
    { emoji: '❌', keywords: ['kreuz', 'cross', 'nein', 'no', 'falsch', 'wrong', 'löschen', 'delete'] },
    { emoji: '❓', keywords: ['fragezeichen', 'question', 'frage', 'hilfe', 'help'] },
    { emoji: '❗', keywords: ['ausrufezeichen', 'exclamation', 'wichtig', 'important', 'warnung', 'warning'] },
    { emoji: '💯', keywords: ['hundert', 'hundred', 'perfekt', 'perfect', 'punkte', 'points', 'voll', 'full'] },
    { emoji: '🔴', keywords: ['rot', 'red', 'kreis', 'circle', 'punkt', 'dot'] },
    { emoji: '🟠', keywords: ['orange', 'kreis', 'circle', 'punkt', 'dot'] },
    { emoji: '🟡', keywords: ['gelb', 'yellow', 'kreis', 'circle', 'punkt', 'dot'] },
    { emoji: '🟢', keywords: ['grün', 'green', 'kreis', 'circle', 'punkt', 'dot', 'aktiv', 'active'] },
    { emoji: '🔵', keywords: ['blau', 'blue', 'kreis', 'circle', 'punkt', 'dot'] },
  ],
  'Nature': [
    { emoji: '🌸', keywords: ['kirschblüte', 'cherry blossom', 'blume', 'flower', 'rosa', 'pink', 'frühling', 'spring'] },
    { emoji: '🌺', keywords: ['hibiskus', 'hibiscus', 'blume', 'flower', 'tropisch', 'tropical'] },
    { emoji: '🌻', keywords: ['sonnenblume', 'sunflower', 'blume', 'flower', 'gelb', 'yellow'] },
    { emoji: '🌼', keywords: ['blüte', 'blossom', 'blume', 'flower', 'gänseblümchen', 'daisy'] },
    { emoji: '🌷', keywords: ['tulpe', 'tulip', 'blume', 'flower', 'frühling', 'spring'] },
    { emoji: '🌹', keywords: ['rose', 'blume', 'flower', 'rot', 'red', 'liebe', 'love', 'romantisch', 'romantic'] },
    { emoji: '🥀', keywords: ['welke rose', 'wilted', 'blume', 'flower', 'traurig', 'sad'] },
    { emoji: '💐', keywords: ['blumenstrauß', 'bouquet', 'blumen', 'flowers', 'geschenk', 'gift'] },
    { emoji: '🌲', keywords: ['baum', 'tree', 'nadelbaum', 'evergreen', 'wald', 'forest', 'weihnachten', 'christmas'] },
    { emoji: '🌳', keywords: ['baum', 'tree', 'laubbaum', 'deciduous', 'wald', 'forest', 'natur', 'nature'] },
    { emoji: '🌴', keywords: ['palme', 'palm', 'baum', 'tree', 'tropisch', 'tropical', 'strand', 'beach'] },
    { emoji: '🌵', keywords: ['kaktus', 'cactus', 'wüste', 'desert', 'pflanze', 'plant'] },
    { emoji: '🌾', keywords: ['reis', 'rice', 'getreide', 'grain', 'ernte', 'harvest', 'landwirtschaft', 'agriculture'] },
    { emoji: '🌿', keywords: ['kräuter', 'herb', 'pflanze', 'plant', 'grün', 'green', 'natur', 'nature'] },
    { emoji: '☘️', keywords: ['kleeblatt', 'shamrock', 'irisch', 'irish', 'glück', 'luck'] },
    { emoji: '🍀', keywords: ['kleeblatt', 'clover', 'vier', 'four', 'glück', 'luck'] },
    { emoji: '🍁', keywords: ['ahornblatt', 'maple', 'herbst', 'fall', 'autumn', 'kanada', 'canada'] },
    { emoji: '🍂', keywords: ['blätter', 'leaves', 'herbst', 'fall', 'autumn'] },
    { emoji: '🍃', keywords: ['blatt', 'leaf', 'wind', 'natur', 'nature'] },
    { emoji: '🌍', keywords: ['erde', 'earth', 'welt', 'world', 'europa', 'europe', 'afrika', 'africa', 'globus', 'globe'] },
    { emoji: '🌎', keywords: ['erde', 'earth', 'welt', 'world', 'amerika', 'americas', 'globus', 'globe'] },
    { emoji: '🌏', keywords: ['erde', 'earth', 'welt', 'world', 'asien', 'asia', 'globus', 'globe'] },
    { emoji: '🌑', keywords: ['mond', 'moon', 'neumond', 'new moon', 'nacht', 'night'] },
    { emoji: '🌒', keywords: ['mond', 'moon', 'zunehmend', 'waxing', 'nacht', 'night'] },
    { emoji: '🦋', keywords: ['schmetterling', 'butterfly', 'insekt', 'insect', 'schön', 'beautiful'] },
    { emoji: '🐝', keywords: ['biene', 'bee', 'honig', 'honey', 'insekt', 'insect', 'fleißig', 'busy'] },
    { emoji: '🐛', keywords: ['raupe', 'bug', 'insekt', 'insect', 'wurm', 'caterpillar'] },
    { emoji: '🦄', keywords: ['einhorn', 'unicorn', 'magisch', 'magical', 'fantasie', 'fantasy'] },
    { emoji: '🐱', keywords: ['katze', 'cat', 'kätzchen', 'kitten', 'tier', 'animal', 'haustier', 'pet'] },
    { emoji: '🐶', keywords: ['hund', 'dog', 'welpe', 'puppy', 'tier', 'animal', 'haustier', 'pet'] },
    { emoji: '🐻', keywords: ['bär', 'bear', 'tier', 'animal', 'teddy'] },
    { emoji: '🦊', keywords: ['fuchs', 'fox', 'tier', 'animal', 'schlau', 'clever'] },
  ],
  'Food & Drink': [
    { emoji: '🍎', keywords: ['apfel', 'apple', 'rot', 'red', 'obst', 'fruit', 'gesund', 'healthy'] },
    { emoji: '🍐', keywords: ['birne', 'pear', 'obst', 'fruit', 'grün', 'green'] },
    { emoji: '🍊', keywords: ['orange', 'mandarine', 'tangerine', 'obst', 'fruit'] },
    { emoji: '🍋', keywords: ['zitrone', 'lemon', 'sauer', 'sour', 'gelb', 'yellow'] },
    { emoji: '🍌', keywords: ['banane', 'banana', 'obst', 'fruit', 'gelb', 'yellow'] },
    { emoji: '🍉', keywords: ['wassermelone', 'watermelon', 'obst', 'fruit', 'sommer', 'summer'] },
    { emoji: '🍇', keywords: ['trauben', 'grapes', 'obst', 'fruit', 'wein', 'wine'] },
    { emoji: '🍓', keywords: ['erdbeere', 'strawberry', 'obst', 'fruit', 'rot', 'red', 'beere', 'berry'] },
    { emoji: '🫐', keywords: ['blaubeere', 'blueberry', 'obst', 'fruit', 'beere', 'berry'] },
    { emoji: '🍒', keywords: ['kirschen', 'cherry', 'obst', 'fruit', 'rot', 'red'] },
    { emoji: '🍑', keywords: ['pfirsich', 'peach', 'obst', 'fruit'] },
    { emoji: '🥭', keywords: ['mango', 'obst', 'fruit', 'tropisch', 'tropical'] },
    { emoji: '🍍', keywords: ['ananas', 'pineapple', 'obst', 'fruit', 'tropisch', 'tropical'] },
    { emoji: '🥥', keywords: ['kokosnuss', 'coconut', 'obst', 'fruit', 'tropisch', 'tropical'] },
    { emoji: '🥝', keywords: ['kiwi', 'obst', 'fruit', 'grün', 'green'] },
    { emoji: '🍅', keywords: ['tomate', 'tomato', 'gemüse', 'vegetable', 'rot', 'red'] },
    { emoji: '☕', keywords: ['kaffee', 'coffee', 'getränk', 'drink', 'heiß', 'hot', 'morgen', 'morning'] },
    { emoji: '🍵', keywords: ['tee', 'tea', 'getränk', 'drink', 'heiß', 'hot', 'grün', 'green'] },
    { emoji: '🧃', keywords: ['saft', 'juice', 'getränk', 'drink', 'box'] },
    { emoji: '🥤', keywords: ['getränk', 'drink', 'becher', 'cup', 'strohhalm', 'straw'] },
    { emoji: '🧋', keywords: ['bubble tea', 'boba', 'getränk', 'drink', 'milchtee', 'milk tea'] },
    { emoji: '🍺', keywords: ['bier', 'beer', 'getränk', 'drink', 'alkohol', 'alcohol'] },
    { emoji: '🍷', keywords: ['wein', 'wine', 'rot', 'red', 'getränk', 'drink'] },
    { emoji: '🍸', keywords: ['cocktail', 'getränk', 'drink', 'martini'] },
  ],
};

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

export function EmojiPicker({ value, onChange, disabled, className }: EmojiPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
    setSearch('');
  };

  // Filter emojis based on search - supports German and English keywords
  const filteredCategories = React.useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return EMOJI_DATA;
    
    const filtered: Record<string, EmojiData[]> = {};
    
    Object.entries(EMOJI_DATA).forEach(([category, emojis]) => {
      const matchingEmojis = emojis.filter((emojiData) =>
        emojiData.keywords.some((keyword) => 
          keyword.toLowerCase().includes(searchTerm)
        )
      );
      
      if (matchingEmojis.length > 0) {
        filtered[category] = matchingEmojis;
      }
    });
    
    return filtered;
  }, [search]);

  const hasResults = Object.keys(filteredCategories).length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-lg transition-all',
            'hover:bg-accent hover:border-accent-foreground/20',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            open && 'ring-2 ring-ring ring-offset-2',
            className
          )}
          aria-label="Select emoji"
        >
          {value || '📚'}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0" 
        align="start"
        sideOffset={8}
        style={{ width: '296px' }}
      >
        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Suche / Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
              autoFocus
            />
          </div>
        </div>

        {/* Emoji grid with native scroll */}
        <div 
          className="overflow-y-auto overscroll-contain p-2"
          style={{ maxHeight: '240px' }}
          onWheel={(e) => e.stopPropagation()}
        >
          {hasResults ? (
            Object.entries(filteredCategories).map(([category, emojis]) => (
              <div key={category} className="mb-3 last:mb-0">
                <div className="px-1 mb-1.5 text-xs font-medium text-muted-foreground sticky top-0 bg-popover py-1 z-10">
                  {category}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 32px)', gap: '2px' }}>
                  {emojis.map((emojiData, index) => (
                    <button
                      key={`${emojiData.emoji}-${index}`}
                      type="button"
                      onClick={() => handleSelect(emojiData.emoji)}
                      className={cn(
                        'flex items-center justify-center rounded-md text-lg transition-colors',
                        'hover:bg-accent',
                        value === emojiData.emoji && 'bg-accent ring-1 ring-primary/50'
                      )}
                      style={{ width: '32px', height: '32px' }}
                      aria-label={`Select ${emojiData.emoji}`}
                    >
                      {emojiData.emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <span className="text-2xl mb-2">🔍</span>
              <span className="text-sm">Keine Emojis gefunden</span>
              <span className="text-xs">No emojis found</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
