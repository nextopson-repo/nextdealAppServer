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
  
    @Column({ type: 'varchar' })
    residential!: string;
  
    @Column({ type: 'varchar' })
    commercial!: string;
  
    @Column({ type: 'varchar' })
    propertyType!: string;
  
    @Column({ type: 'varchar' })
    state!: string;
  
    @Column({ type: 'varchar' })
    city!: string;

    @Column({ type: 'varchar' })
    locality!: string;

    @Column({ type: 'varchar'})
    furnishing!: string;
  
    @Column({ type: 'varchar' })
    propertyFacing!: string;
  
    @Column({ type: 'varchar'})
    viewsOfProperty!: string;
  
    @Column({ type: 'varchar' })
    amenities!: string;
  
    @Column({ type: 'varchar' })
    BHKs!: string;
  
    @Column({ type: 'varchar' })
    constructionStatus!: string;
  
    @Column({ type: 'varchar' })
    ageOfProperty!: string;
  
    @Column({ type: 'varchar'})
    reraApproved!: string;
  
    @Column({ type: 'varchar' })
    fencing!: string;
  
    @Column({ type: 'varchar'})
    soilType!: string;
  
    @Column({ type: 'varchar' })
    approachRoad!: string;
  
    @Column({ type: 'varchar' })
    washrooms!:string;
  
    @Column({ type: 'varchar' })
    parking!: string;
  
    @Column({ type: 'varchar' })
    lookingFor!: string;
  
    @Column({ type: 'varchar' })
    needFor!: string;
  
    @Column({ type: 'varchar'})
    furnishingType!: string;
  
    @Column({ type: 'varchar' })
    BHKType!: string;
  
    @Column({ type: 'varchar' })
    images!: string;
  
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


