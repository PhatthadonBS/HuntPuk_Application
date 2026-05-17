export interface Coordinates {
  x: number;
  y: number;
}

export interface DormRegPostReq {
  owner_id: number;
  name: string;
  address: string;
  lat: number;
  lng: number;
  zone_id: number;
  type_id: number;
  water_unit: number;
  water_lump: number;
  elect_unit: number;
  detail: string;
  facilities: string;
  roomTypes: string;
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
  image: string;
  zone: string;
  lat: number;
  lng: number;
  start_price: number;
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
