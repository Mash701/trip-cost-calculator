import pandas as pd

# Load your cleaned suburbs
suburbs = pd.read_csv("output/vic_suburbs_clean.csv")

# Load postcode dataset
pop = pd.read_csv("data/australian_postcodes.csv")

# Standardize names
suburbs["suburb_name"] = suburbs["suburb_name"].str.upper().str.strip()
pop["Suburb"] = pop["Suburb"].str.upper().str.strip()

# Filter VIC only
pop_vic = pop[pop["State"] == "VIC"]

# Merge
merged = suburbs.merge(
    pop_vic,
    left_on="suburb_name",
    right_on="Suburb",
    how="left"
)

# Keep useful columns
final = merged[[
    "suburb_name",
    "state",
    "lat",
    "lon",
    "Zip"
]]

# Rename Zip to postcode
final = final.rename(columns={"Zip": "postcode"})

# Save
final.to_csv("output/vic_suburbs_final.csv", index=False)

print("Saved: output/vic_suburbs_final.csv")
print(final.head())