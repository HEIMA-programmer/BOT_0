import { Table, Button } from "antd";

function WordList({ words, onDelete }) {

  const columns = [
    {
      title: "Word",
      dataIndex: "word",
      key: "word"
    },
    {
      title: "Meaning",
      dataIndex: "meaning",
      key: "meaning"
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button danger onClick={() => onDelete(record.id)}>
          Remove
        </Button>
      )
    }
  ];

  return (
    <Table
      dataSource={words}
      columns={columns}
      rowKey="id"
      pagination={false}
    />
  );
}

export default WordList;