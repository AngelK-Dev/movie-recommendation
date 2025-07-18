import React, { useEffect, useState } from "react";
import Search from "./components/Search";
import Spinner from "./components/Spinner";
import MovieCard from "./components/MovieCard";
import { useDebounce } from 'react-use';
import { getTrendingMovies, updateSearchCount } from "./appwrite"; 
const API_BASE_URL = "https://api.themoviedb.org/3";

const API_KEY = import.meta.env.VITE_TMBD_API_KEY;

const API_OPTIONS = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
};
const App = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [movieList, setMovieList] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  //Debounces the search term to prevent making too many requests
  // This will wait for 500ms after the user stops typing before updating the search term
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

  const fetchMovies = async (query = '') => {
  setIsLoading(true);
  setErrorMessage("");
  try {
    const endpoint = query ? 
    `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}` :
    `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
    const response = await fetch(endpoint, API_OPTIONS);
    const data = await response.json();


    if (!response.ok) {
      setErrorMessage(data.status_message || "Failed to fetch movies");
      setMovieList([]);
      return;
    }

    setMovieList(data.results || []);

    if(query && data.results.length > 0) {
      // Update search count in Appwrite
      await updateSearchCount(query, data.results[0]);
    }
  } catch (error) {
    console.error(`Error fetching movies: ${error}`);
    setErrorMessage("Error fetching movies. Please try again later.");
    setMovieList([]);
  } finally {
    setIsLoading(false);
  }
};

const loadTrendingMovies = async () => {
  try {
    const movies = await getTrendingMovies();
    // Remove duplicates by movie_id
    const uniqueMovies = [];
    const seen = new Set();
    for (const movie of movies) {
      if (!seen.has(movie.movie_id)) {
        uniqueMovies.push(movie);
        seen.add(movie.movie_id);
      }
    }
    setTrendingMovies(uniqueMovies);
  } catch (error) {
    console.error("Error fetching trending movies:", error);
  }
}
  useEffect(() => {
    fetchMovies(debouncedSearchTerm); // fetch Movies on mount and when debouncedSearchTerm changes
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadTrendingMovies(); // Load trending movies on mount
  }, []);
  return (
    <main>
      <div className="pattern" />
      <div className="wrapper">
        <header>
          
          <h1>
            Find <span className="text-gradient">Movies</span> You'll Enjoy
            Without Stress
          </h1>
          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {trendingMovies.length > 0 && (
        <section className="trending">
          <h2>Trending Movies</h2>
          <ul>
            {trendingMovies.map((movie, index) => (
             <li key={movie.$id}>
              <p>{index + 1}</p>
              <img src={movie.poster_url} alt={movie.title}/>
             </li>
            ))}
            </ul>
            </section>
        )}
            

        <section className="all-movies">
          <h2>All Movies</h2>

          {isLoading ? (
           <Spinner />
          ): errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ): (
            <ul>
  {movieList.map((movie) => (
    <MovieCard key={movie.id} movie={movie}/>
  ))}
</ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default App;
