import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

function App() {
  const [todos, setTodos] = useState<Array<Schema["Todo"]["type"]>>([]);

  useEffect(() => {
    client.models.Todo.observeQuery().subscribe({
      next: (data) => setTodos([...data.items]),
    });
  }, []);

  function createTodo() {
    client.models.Todo.create({ content: window.prompt("Todo content") });
  }
  return (
      <main>
        <h1>Helloo.. More interesting contents would be uploaded to this personal blog soon.</h1>
        <button onClick={createTodo}>+ new</button>
        <ul>
          {todos.map((todo) => (
              <li key={todo.id}>{todo.content}</li>
          ))}
        </ul>
      </main>
  );
}

export default App;