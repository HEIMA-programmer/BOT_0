// Read the content from the AWL.csv file
export const parseAWL = async () => {
  try {
    // Fetch AWL.csv file
    const response = await fetch('/AWL/AWL.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch AWL.csv: ${response.status}`);
    }
    
    let awlCsvContent = await response.text();
    // Remove BOM if present
    awlCsvContent = awlCsvContent.replace(/^\ufeff/, '');
    const lines = awlCsvContent.split('\n');
    const words = [];
    
    console.log('Total lines in AWL.csv:', lines.length);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim()) {
        // Simple CSV parsing
        let word = '';
        let definition = '';
        let inQuotes = false;
        let currentField = '';
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            if (word === '') {
              word = currentField;
            } else {
              definition += currentField + ',';
            }
            currentField = '';
          } else {
            currentField += char;
          }
        }
        
        // Add the last field
        if (word === '') {
          word = currentField;
        } else {
          definition += currentField;
        }
        
        words.push({
          id: words.length + 1,
          text: word.trim(),
          definition: definition.trim(),
          part_of_speech: '', // part-of-speech information
          difficulty_level: 'intermediate', // Default difficulty
          example_sentence: '', // example sentence information
          audio_available: true
        });
      }
    }
    
    console.log('Parsed words:', words.length);
    console.log('First 10 parsed words:', words.slice(0, 10));
    console.log('Last 10 parsed words:', words.slice(-10));
    return words;
  } catch (error) {
    console.error('Error parsing AWL CSV:', error);
    return [];
  }
};

// Randomly select a specified number of words from the AWL
export const getRandomWords = (words, count = 7) => {
  if (!words || words.length === 0) return [];
  
  const shuffled = [...words].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Generate a fixed set of words based on the date (ensure that the words are consistent every day)
export const getDailyWords = (words, date = new Date()) => {
  if (!words || words.length === 0) return [];
  
  const dateStr = date.toISOString().split('T')[0];
  const seed = dateStr.split('-').reduce((acc, num) => acc + parseInt(num), 0);
  
  const count = Math.min(Math.max(5, words.length), 8);
  const selected = [];
  
  for (let i = 0; i < count; i++) {
    const index = (seed + i) % words.length;
    selected.push(words[index]);
  }
  
  return selected;
};
