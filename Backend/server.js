
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}


const path = require("path");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const {
  MONGO_URI,
  JWT_SECRET,
  ARTSY_CLIENT_ID,
  ARTSY_CLIENT_SECRET,
  PORT = 3000,
} = process.env;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ARTSY_URL = "https://api.artsy.net/api";

const app = express();

const allowedOrigins = [
  "http://localhost:4200",
  "https://artsy-assignment3.wl.r.appspot.com"
];

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  avatar: String,
  favorites: [
    {
      id: String,
      name: String,
      imageUrl: String,
      addedAt: { type: Date, default: Date.now },
      birthday: String,
      deathday: String,
      nationality: String,
    },
  ],
});

const User = mongoose.model("User", userSchema);

let artsyToken = "";
let tokenExpiry = 0;

async function getArtsyToken() {
  try {
    const res = await axios.post(`${ARTSY_URL}/tokens/xapp_token`, null, {
      params: {
        client_id: ARTSY_CLIENT_ID,
        client_secret: ARTSY_CLIENT_SECRET,
      },
    });
    artsyToken = res.data.token;
    tokenExpiry = new Date(res.data.expires_at);
  } catch (error) {
    console.error("Error getting Artsy token:", error.response?.data || error.message);
  }
}

async function checkArtsyToken() {
  if (!artsyToken || !tokenExpiry || new Date() >= tokenExpiry) {
    await getArtsyToken();
  }
}

getArtsyToken();

const normalizeBiography = (bio) => {
  if (!bio) return "";
  return bio
    .replace(/\u00A0/g, " ") // Replace non-breaking space with normal space
    .replace(/\u0096|\u2013|\u2014|\u2012/g, "-") // Replace weird dashes with hyphen
    .replace(/–|—/g, "-"); // Also cover en/em dashes
};

function checkAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Not logged in" });

  jwt.verify(token, JWT_SECRET, (err, userData) => {
    if (err) return res.status(403).json({ message: "Invalid session" });
    req.user = userData;
    next();
  });
}

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required." });

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email must be valid." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hash = crypto
      .createHash("sha256")
      .update(email.toLowerCase().trim())
      .digest("hex");

    const avatar = `https://www.gravatar.com/avatar/${hash}?d=identicon`;

    const newUser = new User({ name, email, password: hashedPassword, avatar });
    await newUser.save();
    return res.status(201).json({ message: "Registered successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Email must be valid." });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Password or email is incorrect." });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "1h" });

    res.cookie("token", token, { httpOnly: true }).json({ message: "Logged in", user });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("token", { path: "/" }).json({ message: "Logged out successfully" });
});

app.delete("/api/delete", checkAuth, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user?.userId);
    if (!deletedUser) return res.status(404).json({ message: "User not found" });
    res.clearCookie("token").json({ message: "Account deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/me", checkAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const sortedFavorites = [...user.favorites].sort((a, b) => b.addedAt - a.addedAt);

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      favorites: sortedFavorites,
    };

    res.json(userData);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/favorites", checkAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const favoritesSorted = user.favorites.sort((a, b) => b.addedAt - a.addedAt);
    res.status(200).json({ favorites: favoritesSorted });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/favorite/:artistId", checkAuth, async (req, res) => {
  try {
    await checkArtsyToken();
    const { artistId } = req.params;
    const { addedAt } = req.body;

    const { data: artist } = await axios.get(`${ARTSY_URL}/artists/${artistId}`, {
      headers: { "X-XAPP-Token": artsyToken },
    });

    const updated = await User.findByIdAndUpdate(
      req.user.userId,
      {
        $addToSet: {
          favorites: {
            id: artist.id,
            name: artist.name,
            imageUrl: artist._links?.thumbnail?.href || "",
            addedAt: addedAt ? new Date(addedAt) : new Date(),
            birthday: artist.birthday || "",
            deathday: artist.deathday || "",
            nationality: artist.nationality || "",
          },
        },
      },
      { new: true }
    );

    if (!updated) return res.status(500).json({ message: "Error adding favorite" });
    return res.json({ message: "Added to favorites" });
  } catch (error) {
    return res.status(500).json({ message: "Error adding to favorites" });
  }
});

app.delete("/api/favorite/:artistId", checkAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, {
      $pull: { favorites: { id: req.params.artistId } },
    });
    res.json({ message: "Removed from favorites" });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/artist/:id", async (req, res) => {
  try {
    await checkArtsyToken();
    const { data } = await axios.get(`${ARTSY_URL}/artists/${req.params.id}`, {
      headers: { "X-XAPP-Token": artsyToken },
    });

    if (data.biography) {
      data.biography = normalizeBiography(data.biography);
    }

    res.json(data);
  } catch (error) {
    return res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || "Server error",
    });
  }
});


app.get("/api/artworks/:id", async (req, res) => {
  try {
    await checkArtsyToken();
    const { data } = await axios.get(`${ARTSY_URL}/artworks`, {
      headers: { "X-XAPP-Token": artsyToken },
      params: { artist_id: req.params.id, size: 10 },
    });
    res.json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch artworks" });
  }
});

app.get("/api/categories/:artworkId", async (req, res) => {
  try {
    await checkArtsyToken();
    const { data: artwork } = await axios.get(`${ARTSY_URL}/artworks/${req.params.artworkId}`, {
      headers: { "X-XAPP-Token": artsyToken },
    });

    if (!artwork._links?.genes?.href) {
      return res.status(404).json({ message: "No categories found for this artwork" });
    }

    const { data: categories } = await axios.get(artwork._links.genes.href, {
      headers: { "X-XAPP-Token": artsyToken },
    });

    res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching categories" });
  }
});

app.get("/api/similar/:artistId", checkAuth, async (req, res) => {
  try {
    await checkArtsyToken();
    const { data } = await axios.get(`${ARTSY_URL}/artists?similar_to_artist_id=${req.params.artistId}`, {
      headers: { "X-XAPP-Token": artsyToken },
    });
    res.json(data);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching similar artists" });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;
    console.log(q);
    if (!q) return res.status(400).json({ message: "Query is required" });

    await checkArtsyToken();
    const { data } = await axios.get(`${ARTSY_URL}/search`, {
      headers: { "X-XAPP-Token": artsyToken },
      params: { q, size: 10, type: "artist" },
    });

    const results = data._embedded?.results?.filter((r) => r.type === "artist") || [];
    res.json(results);
  } catch (error) {
    return res.status(500).json({ message: "Search failed" });
  }
});
const fs = require("fs");

app.use(express.static(path.join(__dirname, "public/browser")));

app.get("*", (req, res, next) => {
  const requestedPath = path.join(__dirname, "public/browser", req.path);
  if (fs.existsSync(requestedPath)) {
    return res.sendFile(requestedPath);
  } else {
    return res.sendFile(path.join(__dirname, "public/browser/index.html"));
  }
});


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
