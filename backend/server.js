const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { spawn } = require("child_process");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "../dist")));

app.get("/api/signed-url", async (req, res) => {
  try {
    const { opponent, mode, language } = req.query;
    let agentId = process.env.AGENT_ID; // Default agent ID
      
    console.log(`Getting signed URL for opponent: ${opponent}, mode: ${mode}, language: ${language}`);
    
    // Map opponent to specific market and use the appropriate agent ID
    if (opponent === 'akshat') {
      // Akshat represents Singapore markets
      agentId = process.env.SINGAPORE_AGENT_ID; // agent_0501k86cmfndepn9a9hnb5q5x2j7
    } else if (opponent === 'vikranth') {
      // Vikranth represents Indian markets
      agentId = process.env.INDIA_AGENT_ID; // agent_5401k86cnk7ffs4rzczf032xpv0f
    }
    
    console.log(`Using agent ID: ${agentId}`);
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": process.env.API_KEY || "sk_de44b5d768232e11b1a644e83b93c77701274225f2b3ab13",
        },
      }
    );

    console.log(`ElevenLabs API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs API error: ${errorText}`);
      throw new Error(`Failed to get signed URL: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`Signed URL generated successfully for agent ${agentId}`);
    res.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to get signed URL" });
  }
});

//API route for getting Agent ID, used for public agents
app.get("/api/getAgentId", (req, res) => {
  const agentId = process.env.AGENT_ID;
  res.json({
    agentId: `${agentId}`,
  });
});

// API route for converting SQL query to Screener.in URL
app.post("/api/sql-to-url", (req, res) => {
  try {
    const { sqlQuery } = req.body;
    
    if (!sqlQuery) {
      return res.status(400).json({ error: "SQL query is required" });
    }

    console.log(`Converting SQL query to URL: ${sqlQuery}`);

    // Spawn Python process to convert SQL to URL
    const pythonProcess = spawn('python', [path.join(__dirname, '../screener_url_generator.py')], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const url = output.trim();
          console.log(`Generated URL: ${url}`);
          res.json({ url });
        } catch (parseError) {
          console.error('Error parsing Python output:', parseError);
          res.status(500).json({ error: 'Failed to parse URL generation result' });
        }
      } else {
        console.error(`Python script exited with code ${code}:`, errorOutput);
        res.status(500).json({ error: 'Failed to generate URL' });
      }
    });

    // Send the SQL query to the Python script
    pythonProcess.stdin.write(sqlQuery);
    pythonProcess.stdin.end();

  } catch (error) {
    console.error('Error in SQL to URL conversion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/avatar.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/avatar.html"));
});

// Serve index.html for all other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}: http://localhost:${PORT}`);
});
