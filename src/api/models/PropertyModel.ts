export interface PropertyAddress {
    state: string;
    city: string;
    locality: string;
  }
  
  export interface Property {
    id: string;
    availableFor: 'Sale' | 'Lease';
    address: PropertyAddress;
    category: 
      | 'Flats/Builder Floors' 
      | 'House/Villa' 
      | 'Plots' 
      | 'Farmhouse' 
      | 'Office Spaces' 
      | 'Hostel/PG' 
      | 'Shops/Showroom' 
      | 'Hotels' 
      | 'Lands';
  }
  