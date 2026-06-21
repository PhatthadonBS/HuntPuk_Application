export interface FacilityItem {
  FAC_TYPE_ID: number;
  FAC_TYPE_NAME: string;
  FAC_TYPE_ICON: string;
  REQ_STATUS?: number;
}

export interface FacilityGetRes {
  success: boolean;
  data: FacilityItem[];
}

export interface MasterType {
  id: number;
  name: string;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface DormRegPostReq {
  user_id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  zone_id: number;
  type_id: number;
  water_unit: number | null;
  water_lump: number | null;
  elect_unit: number | null;
  detail: string;
  facilities: string; // JSON string of IDs
  roomTypes: string; // JSON string of RoomTypeItems
}

export interface RoomTypeItem {
  roomTypeId?: number | string;
  roomType: string;
  bedType: string;
  perMonth: number;
  perTerm: number;
}

export interface DormRoomTypeReqPostReq {
  roomType: string;
  bedType: string;
  perMonth: string | number;
  perTerm: string | number;
}

export interface DormAllGetRes {
  success: boolean;
  data: DormSummary[];
}

export interface DormSummary {
  DORM_ID: number;
  DORM_NAME: string;
  ADDRESS: string;
  SCORE: string;
  image?: string; // used by some endpoints
  FRONT_DORM_IMAGE?: string; // used by owner endpoints
  zone?: string;
  ZONE_NAME?: string;
  lat: number;
  lng: number;
  start_price: number;
  update_at?: string;
  DORM_STATUS_ID: number;
  DORM_STATUS_NAME: string;
  REQ_STATUS: number;
  isFavorite?: boolean;
}

export interface DormDetail {
  DORM_ID: number;
  DORM_NAME: string;
  ADDRESS: string;
  SCORE: string;
  image: string;
  ZONE_ID: number;
  ZONE_NAME: string;
  DORM_TYPE_ID: number;
  lat: number;
  lng: number;
  start_price: number;
  term_price?: number;
  phone: string;
  line: string;
  facebook: string;
  instagram: string;
  telegram: string;
  x: string;
  facilities: { name: string; icon: string }[];
  gallery: string[];
  ceiling_img?: string;
  wall_img?: string;
  floor_img?: string;
  bathroom_img?: string;
  balcony_img?: string;
  rooms: { 
    ROOM_TYPE_ID: number;
    ROOM_TYPE_NAME: string; 
    PRICE: number; 
    perTerm: number; 
    perDay: number; 
    bedType: string;
    BED_TYPE_ID: number;
  }[];
  WATER_UNIT: number;
  WATER_LUMP: number;
  ELECT_UNIT: number;
  ADD_DORM_DATA: string;
  USER_ID: number;
  FIRST_NAME: string;
  LAST_NAME: string;
  DORM_STATUS_ID: number;
  DORM_LICENSE?: string;
}

export interface DormDetailGetRes {
  success: boolean;
  data: DormDetail;
}

export interface DormRoomImgTypeGetRes {
  IMG_ROOM_TYPE_ID: number;
  IMG_ROOM_TYPE_NAME: string;
}

export interface FacOfDormGetRes {
  FAC_DORM_ID: number;
  FAC_TYPE_ID: number;
  FAC_TYPE_NAME: string;
  FAC_TYPE_ICON: string;
  DORM_ID: number;
}

export interface DormZone {
  ZONE_ID: number;
  ZONE_NAME: string;
  lat: number;
  lng: number;
}

export interface DormZoneGetRes {
  success: boolean;
  data: DormZone[];
}

export interface ReviewItem {
  REVIEW_ID: number;
  SCORE: number;
  COMMENTS: string;
  CREATE_AT: string;
  USER_ID: number;
  USERNAME: string;
}

export interface ReviewGetRes {
  success: boolean;
  count: number;
  data: ReviewItem[];
}
