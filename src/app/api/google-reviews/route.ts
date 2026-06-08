import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface GooglePlacesReview {
  author_name: string;
  text?: string;
  rating?: number;
  relative_time_description?: string;
  profile_photo_url?: string;
}

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return NextResponse.json({
      success: false,
      configured: false,
      reviews: [],
      message: "Google reviews will appear here after configuration."
    });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${apiKey}`;
    
    const response = await fetch(url, { 
      next: { revalidate: 3600 } // Cache results for 1 hour to prevent API quota depletion
    });
    
    const data = await response.json();

    if (data.status !== "OK") {
      console.warn("[google-reviews] Google Places Details API error status:", data.status, data.error_message);
      return NextResponse.json({
        success: false,
        configured: true,
        reviews: [],
        message: `Failed to fetch reviews: Google Places status is ${data.status}`
      });
    }

    const reviews: GooglePlacesReview[] = data.result?.reviews || [];
    const rating = data.result?.rating || 0;
    const totalRatings = data.result?.user_ratings_total || 0;

    const formattedReviews = reviews.map((r: GooglePlacesReview) => ({
      name: r.author_name,
      location: "Google Reviewer",
      text: r.text || "",
      rating: r.rating || 5,
      timeDescription: r.relative_time_description || "recently",
      profilePhoto: r.profile_photo_url || null,
    }));

    return NextResponse.json({
      success: true,
      configured: true,
      reviews: formattedReviews,
      rating,
      totalRatings
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unknown error occurred";
    console.error("[google-reviews] Server error fetching place details:", message);
    return NextResponse.json({
      success: false,
      configured: true,
      reviews: [],
      message: "An internal server error occurred while retrieving reviews."
    });
  }
}
