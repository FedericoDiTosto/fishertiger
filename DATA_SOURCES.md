# Data Sources

The project ships structured, versioned input files in `data/raw/` so a fresh
clone can generate a dataset locally. The files cover the player list, Serie A
calendar, historical statistics, club priors, likely starters, set-piece order,
and auction tiers.

The private fantasy-league calendar is deliberately not committed. Upload it
from **Impostazioni** after cloning the project. Its participating teams must
match the profile participants before generation can proceed.

The application treats the files as input data, not as a remote scraping layer.
If you replace them for another season, update the profile source declarations
and retain attribution required by the data license.
