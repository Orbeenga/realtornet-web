# Form Field Standards - RealtorNet UI Spec

## Global Typography
- Use the shared system font stack defined in `src/app/globals.css`
- Do not reintroduce hosted Google Fonts for dashboard or form surfaces
- All account and listing flows inherit the same `font-sans` base treatment

## Text Inputs (single line)
- Max width: 600px, full width on mobile (< 640px breakpoint)
- Height: 44px
- Padding: px-3 py-2
- No expansion on content overflow - text scrolls within field
- Centered within form column on desktop

## Textarea (multi-line)
- Max width: 640px, full width on mobile
- Height: 160px fixed
- resize: none
- overflow-y: auto (scrollable, not expandable)
- Centered within form column on desktop
- Slightly wider than tall (landscape rectangle)

## Behaviour
- All inputs controlled via React Hook Form
- Validation errors render below the field, never inside it
- Character entry scrolls within the box - box never grows

## Application
- Apply to all listing form fields
- Apply to all account/profile form fields
- Apply consistently across create and edit variants of the same form

## Account Management Pages
- Page container: max-w-[800px] mx-auto
- Lists and stacked cards stay within the centered 800px column
- Saved properties, saved searches, inquiries, and listing management pages follow the same centered dashboard width
- Consistent vertical spacing between rows: gap-4
- Use /account/listings as the visual reference standard

## Saved Searches Page
- Saved search cards stay within the same centered 800px dashboard column
- Card actions align with the shared account action row treatment
- Empty, loading, and error states should preserve the same page width and heading rhythm as other account pages

## Property Detail Page
- Remove outer paper/card backgrounds from the main detail sections
- Image gallery, property details, agent information, map, and inquiry sections render as plain stacked sections on the page background
- Keep inner utility surfaces only where they communicate data clearly: spec chips, map frame, thumbnail buttons, and alerts

## Listing Image Rendering
- Property cards and My Listings rows fetch images separately via the property-images endpoint using property_id
- Use the first image in the returned array as the display image because the backend sorts primary first
- Render with a standard img tag until remote image hosts are whitelisted for next/image
- If images are loading or absent, fall back to the existing placeholder block without breaking layout
- Never hardcode or assume image URLs from PropertyResponse because images are not included in that payload

## Image Upload Manager
- Drop zone max width: 480px, height: 120px fixed, centered
- Image grid max width: 480px, 3 cols desktop / 2 cols mobile, aspect-video tiles
- Section wrapper: centered, drop zone stacked above grid
- Tile labels use the 1-based position in the current images array (Image 1, Image 2, Image 3)
- Caption, when present, renders as secondary text below the position label
- Set primary and delete controls render on the tile hover overlay
- Image upload requires an existing property_id, so upload is available on edit, not create
- Post-create prompt appears on the edit page when ?created=true is present in the URL to direct the agent to add photos

## Image Display in Cards and List Rows
- Always use usePropertyImages(property_id) to fetch the primary image per card or row
- Display images[0] because the backend read order is is_primary DESC, display_order ASC
- Render with an img tag using object-cover to fill the image area
- While loading or when no images exist, show the placeholder block and preserve layout
- Never assume PropertyResponse includes image URLs

## Storage Upload Pattern (backend)
- Always derive content-type from file extension via mimetypes.guess_type(), falling back to image/jpeg
- Pass content-type explicitly in Supabase storage upload options
- Use get_supabase_admin_client() for all storage operations, not the anon client
- Do not manually inspect upload responses for errors; rely on StorageApiError raised by the SDK

## Listing Management Page (account/listings)
- Row layout: thumbnail + info + actions in single horizontal row
- Action buttons immediately right of info (ml-auto), not floated to screen edge
- Max row/page width: 800px, mx-auto centered
- Mobile: stack vertically, actions below info as button row
- Button sizes: sm, Edit=secondary, Delete=destructive, gap-2
- Page heading label: "My listings"

## Listing Form Layout (create and edit)
- Container: max-w-[800px] mx-auto
- Field rows: flex gap-6 flex-wrap (collapses to stacked on mobile)
- Field widths: Title 100%, Description 100% h-40, Price 240px,
  Size 180px, Bedrooms 140px, Bathrooms 140px, Type/Status dropdowns
  200px, Property Type/Location 260px
- No field stretches to screen edge on desktop
- Edit listing page uses a dashboard-style page heading outside the cards
- Edit listing page removes the outer paper/card background behind its sections
- Listing details, images, and amenities render as plain stacked sections within the same 800px centered column

## Amenities Selector
- Amenity selection appears on both create and edit listing flows
- Selected amenities sync through the property-amenities API using the centralized frontend API client
- Loading and error states render inline within the listing form column without changing page width

This file is the repeatable reference. Any future form field implementation must conform to it before PR.
