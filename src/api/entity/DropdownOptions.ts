import {
    BaseEntity,
    BeforeInsert,
    Column,
    Entity,
    PrimaryGeneratedColumn,
  } from 'typeorm';
  import { randomBytes } from 'crypto';
  

  enum ResidentialOptions {
    Flats = 'Flats/Builder Floors',
    House = 'House/Villa',
    Plots = 'Plots',
    Farmhouse = 'Farmhouse',
  }
  
  enum CommercialOptions {
    Hotels = 'Hotels',
    Lands = 'Lands',
    Plots = 'Plots',
    OfficeSpaces = 'Office spaces',
    HostelPG = 'Hostel/PG',
    ShopsShowroom = 'Shops/Showroom',
  }
  
  enum PropertyTypeOptions {
    Sale = 'Sale',
    Lease = 'Lease',
  }
  
  enum StateOptions {
    Delhi = 'Delhi',
    Haryana = 'Haryana',
    UttarPradesh = 'Uttar Pradesh',
  }
  
  enum CityOptions {
    Delhi = 'Delhi',
    Gurugram = 'Gurugram',
    Noida = 'Noida',
  }
  
  enum FurnishingOptions {
    Furnished = 'Furnished',
    SemiFurnished = 'Semi-furnished',
    Unfurnished = 'Unfurnished',
  }
  
  enum PropertyFacingOptions {
    East = 'East',
    West = 'West',
    North = 'North',
    South = 'South',
    NE = 'NE',
    NW = 'NW',
    SE = 'SE',
    SW = 'SW',
  }
  
  enum ViewsOfPropertyOptions {
    Sea = 'Sea',
    Lake = 'Lake',
    Park = 'Park',
    River = 'River',
    Mountain = 'Mountain',
    Road = 'Road',
    Garden = 'Garden',
    Unspecified = 'Unspecified',
    Skyline = 'Skyline',
    Beach = 'Beach',
    Forest = 'Forest',
  }
  
  enum AmenitiesOptions {
    Parking = 'Parking',
    CCTV = 'CCTV',
    Security = 'Security',
    Garden = 'Garden',
    FreeWifi = 'Free Wifi',
    WheelChair = 'WheelChair',
    Unspecified = 'Unspecified',
  }
  
  enum BHKsOptions {
    OneBHK = '1 BHK',
    TwoBHK = '2 BHK',
    ThreeBHK = '3 BHK',
    FourBHK = '4 BHK',
    FiveBHK = '5 BHK',
    FivePlusBHK = '5+',
  }
  
  enum ConstructionStatusOptions {
    UnderConstruction = 'Under Construction',
    ReadyToMove = 'Ready to move',
    NewLaunch = 'New Launch',
  }
  
  enum AgeOfPropertyOptions {
    ZeroToFive = '0-5 Yrs',
    FiveToTen = '5-10 Yrs',
    MoreThanTen = 'More than 10 Yrs',
  }
  
  enum YesNoOptions {
    Yes = 'Yes',
    No = 'No',
  }
  
  enum SoilTypeOptions {
    Sandy = 'Sandy',
    Clay = 'Clay',
    Loamy = 'Loamy',
    Rocky = 'Rocky',
    Silty = 'Silty',
    Peaty = 'Peaty',
    Saline = 'Saline',
  }
  
  enum ApproachRoadOptions {
    Paved = 'Paved',
    NotPaved = 'Not Paved',
  }
  
  enum WashroomsOptions {
    Common = 'Common',
    Private = 'Private',
  }
  
  enum ParkingOptions {
    Public = 'Public',
    Private = 'Private',
  }
  
  enum LookingForOptions {
    Flat = 'Flat',
    BuilderFloor = 'Builder Floor',
    Plot = 'Plot',
    House = 'House',
    Villa = 'Villa',
    Farmhouse = 'Farmhouse',
    Hotel = 'Hotel',
    Land = 'Land',
    OfficeSpace = 'Office Space',
    HostelPG = 'Hostel/PG',
    Shop = 'Shop',
    Showroom = 'Showroom',
  }
  
  enum NeedForOptions {
    Lease = 'Lease',
    Sale = 'Sale',
  }
  
  enum FurnishingTypeOptions {
    Furnished = 'Furnished',
    Unfurnished = 'Unfurnished',
  }
  
  enum BHKTypeOptions {
    OneBHK = '1 BHK',
    TwoBHK = '2 BHK',
    ThreeBHK = '3 BHK',
    FourBHK = '4 BHK',
    FiveBHK = '5 BHK',
    FivePlusBHK = '5+ BHK',
  }
  
  enum ImagesOptions {
    All = 'All',
    Rooms = 'Rooms',
    Lobby = 'Lobby',
    Reception = 'Reception',
    CommonArea = 'Common Area',
  }
  
  @Entity('DropdownOptions')
  export class DropdownOptions extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;
  
    @Column({ type: 'enum', enum: ResidentialOptions })
    res!: ResidentialOptions;
  
    @Column({ type: 'enum', enum: CommercialOptions })
    commercial!: CommercialOptions;
  
    @Column({ type: 'enum', enum: PropertyTypeOptions })
    propertyType!: PropertyTypeOptions;
  
    @Column({ type: 'enum', enum: StateOptions })
    state!: StateOptions;
  
    @Column({ type: 'enum', enum: CityOptions })
    city!: CityOptions;
  
    @Column({ type: 'enum', enum: FurnishingOptions })
    furnishing!: FurnishingOptions;
  
    @Column({ type: 'enum', enum: PropertyFacingOptions })
    propertyFacing!: PropertyFacingOptions;
  
    @Column({ type: 'enum', enum: ViewsOfPropertyOptions, array: true })
    viewsOfProperty!: ViewsOfPropertyOptions[];
  
    @Column({ type: 'enum', enum: AmenitiesOptions, array: true })
    amenities!: AmenitiesOptions[];
  
    @Column({ type: 'enum', enum: BHKsOptions })
    BHKs!: BHKsOptions;
  
    @Column({ type: 'enum', enum: ConstructionStatusOptions })
    constructionStatus!: ConstructionStatusOptions;
  
    @Column({ type: 'enum', enum: AgeOfPropertyOptions })
    ageOfProperty!: AgeOfPropertyOptions;
  
    @Column({ type: 'enum', enum: YesNoOptions })
    reraApproved!: YesNoOptions;
  
    @Column({ type: 'enum', enum: YesNoOptions })
    fencing!: YesNoOptions;
  
    @Column({ type: 'enum', enum: SoilTypeOptions })
    soilType!: SoilTypeOptions;
  
    @Column({ type: 'enum', enum: ApproachRoadOptions })
    approachRoad!: ApproachRoadOptions;
  
    @Column({ type: 'enum', enum: WashroomsOptions })
    washrooms!: WashroomsOptions;
  
    @Column({ type: 'enum', enum: ParkingOptions })
    parking!: ParkingOptions;
  
    @Column({ type: 'enum', enum: LookingForOptions, array: true })
    lookingFor!: LookingForOptions[];
  
    @Column({ type: 'enum', enum: NeedForOptions, array: true })
    needFor!: NeedForOptions[];
  
    @Column({ type: 'enum', enum: FurnishingTypeOptions, array: true })
    furnishingType!: FurnishingTypeOptions[];
  
    @Column({ type: 'enum', enum: BHKTypeOptions, array: true })
    BHKType!: BHKTypeOptions[];
  
    @Column({ type: 'enum', enum: ImagesOptions })
    images!: ImagesOptions;
  
    @Column({ type: 'varchar', default: 'system' })
    createdBy!: string;
  
    @Column({ type: 'varchar', default: 'system' })
    updatedBy!: string;
  
    @Column({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP(6)',
      precision: 6,
    })
    createdAt!: Date;
  
    @Column({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP(6)',
      onUpdate: 'CURRENT_TIMESTAMP(6)',
      precision: 6,
    })
    updatedAt!: Date;
  
    @BeforeInsert()
    async generateUUID() {
      this.id = randomBytes(16).toString('hex');
    }
  }


