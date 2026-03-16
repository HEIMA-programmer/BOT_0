import { useEffect, useState } from "react";
import { Card, Input, Button, message } from "antd";
import WordList from "../components/WordList";

function WordBank() {

  const [words, setWords] = useState([]);
  const [wordId, setWordId] = useState("");

  useEffect(() => {

    setWords([
      { id: 1, word: "analyze", meaning: "to examine carefully" },
      { id: 2, word: "evidence", meaning: "proof or data" },
      { id: 3, word: "theory", meaning: "explanation of facts" }
    ]);

  }, []);

  const handleDelete = (id) => {
    setWords(words.filter(w => w.id !== id));
  };

  const handleAdd = () => {

    const newWord = {
      id: Date.now(),
      word: wordId,
      meaning: "temporary meaning"
    };

    setWords([...words, newWord]);
    setWordId("");
    message.success("Word added");
  };

  return (

    <Card title="Word Bank" style={{ width: 700, margin: "40px auto" }}>

      <div style={{ marginBottom: 20 }}>

        <Input
          placeholder="Enter word"
          value={wordId}
          onChange={(e) => setWordId(e.target.value)}
          style={{ width: 200, marginRight: 10 }}
        />

        <Button type="primary" onClick={handleAdd}>
          Add Word
        </Button>

      </div>

      <WordList words={words} onDelete={handleDelete} />

    </Card>
  );
}

export default WordBank;