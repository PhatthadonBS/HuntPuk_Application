import { FormControl } from '@angular/forms';

export interface DecodedToken {
  id: number;
  role: number;
  status: number;
  iat: number;
  exp: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  role_id: number;
  accout_status: number;
}

export interface UserRegPostReq {
  username: string;
  email: string;
  password: string;
  phone: string;
}

export interface UserUpdatePostReq {
  username: string | null;
  phone_number: string | null;
  first_name?: string | null;
  last_name?: string | null;
  facebook?: string | null;
  line?: string | null;
  instagram?: string | null;
  x?: string | null;
  telegram?: string | null;
}

export interface UserRegPostReqForm {
  username: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
  phone: FormControl<string>;
}

export interface UserUpdatePostReqForm {
  username: FormControl<string | null>;
  phone_number: FormControl<string | null>;
  first_name?: FormControl<string | null>;
  last_name?: FormControl<string | null>;
  facebook?: FormControl<string | null>;
  line?: FormControl<string | null>;
  instagram?: FormControl<string | null>;
  x?: FormControl<string | null>;
  telegram?: FormControl<string | null>;
}

export interface UserDormOwnerReqPostReq {
  user_id: number;
  first_name: string;
  last_name: string;
  facebook: string | null;
  line: string | null;
  x: string | null;
  instagram: string | null;
  telegram: string | null;
}

export interface UserAllGetRes {
  USER_ID: number;
  USERNAME: string;
  EMAIL: string;
  PHONE_NUMBER: string;
  ROLE_TYPE_ID: number;
  ACCOUNT_STATUS: number;
  FIRST_NAME?: string;
  LAST_NAME?: string;
  PROFILE_IMAGE?: string;
  FACEBOOK?: string | null;
  INSTAGRAM?: string | null;
  LINE?: string | null;
  TELEGRAM?: string | null;
  X?: string | null;
}

export interface UserDataGetRes {
  USER_ID: number;
  USERNAME: string;
  EMAIL: string;
  PHONE_NUMBER: string;
  ROLE_TYPE_ID: number;
  ACCOUNT_STATUS: number;
}

export interface UserDataPostRes {
  USER_ID: number;
  USERNAME: string;
  EMAIL: string;
  PASSWORD: string;
  PHONE_NUMBER: string;
  ROLE_TYPE_ID: number;
  ACCOUNT_STATUS: number;
}

export interface UserDormOwnerGetRes {
  USER_ID: number;
  FIRST_NAME: string;
  LAST_NAME: string;
  FACEBOOK: string | null;
  INSTAGRAM: string | null;
  LINE: string | null;
  TELEGRAM: string | null;
  X: string | null;
  REQ_STATUS: number;
  PROFILE_IMAGE: string;
  USERNAME: string;
  EMAIL: string;
  PHONE_NUMBER: string;
  ROLE_TYPE_ID: number;
  ACCOUNT_STATUS: number;
}

export interface UserFavGetRes {
  DORMID: number;
  DORMNAME: string;
  OWNERNAME: string;
  UPDATEDAT: string;
  ADDRESS: string;
  COVERIMAGE: string;
  SCORE: string;
  DORM_STATUS_NAME: string;
  ZONE_NAME: string | null;
  START_PRICE: number;
}

export interface UserLoggedInPostRes {
  logged_in: boolean;
  message: string;
  token: string;
  user: User;
}

export interface UserLoginPostRes {
  USER_ID: number;
  USERNAME: string;
  EMAIL: string;
  PASSWORD: string;
  PHONE_NUMBER: string;
  ROLE_TYPE_ID: number;
  ACCOUNT_STATUS: number;
}

export interface UserOtpVerifyPostRes {
  status: boolean;
  email: string;
  msg: string;
}

export interface OtpVerifyPostRes {
  OTP_CODE: string;
  CREATE_AT: string;
  EMAIL: string;
}
