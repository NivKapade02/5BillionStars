# Google guest reviews

The homepage section is placed between the camping schedule and contact section.
It links to the exact Google Maps listing supplied by the owner (CID derived from
0xa2e9f51509b0642). No reviews or aggregate rating have been invented.

Google Maps did not expose review text through the shared link. Until actual
reviews are supplied, the section shows a Google review invitation and links.

Populate public/google-reviews.json with genuine review text copied from the
listing, retaining the original author, rating and wording:

    { "rating": null, "totalReviews": null, "reviews": [] }

Each review object has author (string), rating (4 or 5), text (string), and optional
dateLabel (the actual displayed publication date). Up to eight qualifying reviews
are shown, in file order. Enter actual source data only. The caption explicitly
identifies these as featured 4- and 5-star reviews and links to all Google reviews.
The optional rating and totalReviews are the overall Google listing figures,
not a calculation from the featured subset. Leave both null until verified.

This is a locally maintained review feed, not automatic Google synchronization.
For live updates, supply an authorized review widget embed or configure a server
integration with Google Places/Business Profile. Keep API credentials server-side.


Overall Google rating supplied by the owner on 1 November 2026: 4.8 from 138 reviews. The eight featured cards display in four columns and two rows on desktop, two columns on smaller screens, and one column on mobile.
