import MovieNightClient from "@/components/movie-night-client";

export const metadata = {
  title: "Hva skal vi se?",
  description: "Generer et tema og to filmer fra samlingen",
};

export default function Page() {
  return <MovieNightClient />;
}
