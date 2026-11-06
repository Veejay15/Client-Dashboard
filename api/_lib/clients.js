/* ==========================================================================
   CLIENT → LOCAL DOMINATOR MAPPING
   --------------------------------------------------------------------------
   Which Local Dominator scans belong to which dashboard client. The API only
   ever returns scans for the ids listed here, so the endpoint cannot be used
   to browse every scan on the Makarios Local Dominator team.

   search        Text sent to Local Dominator's `text` filter (matches the
                 business name, keywords and labels). Narrows the request.
   nameIncludes  A scan belongs to the client when its business name contains
                 any of these (case-insensitive). Used when placeId is empty.
   placeId       Google Place ID. When set it is the ONLY match rule — the
                 most reliable option. Copy it from any scan in Local Dominator.
   ========================================================================== */
"use strict";

module.exports = {
  amf: {
    name: "Americana Iron Works & Fence",
    search: "Americana",
    nameIncludes: ["americana"],
    placeId: ""
  },
  apg: {
    name: "A Plus Garage Doors",
    search: "A Plus Garage",
    nameIncludes: ["a plus garage", "a+ garage"],
    placeId: ""
  },
  jit: {
    name: "Junk In The Truck",
    search: "Junk In The Truck",
    nameIncludes: ["junk in the truck"],
    placeId: ""
  },
  lhv: {
    name: "Lincolnton Home VA",
    search: "Lincolnton",
    nameIncludes: ["lincolnton"],
    placeId: ""
  }
};
