import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

function App() {
  return (
      <main>
        <h1>Helloo.. More interesting contents would be uploaded to this personal blog soon.</h1>
      </main>
  );
}

export default App;