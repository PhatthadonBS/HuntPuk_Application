export interface DormAllGetRes {
    success: boolean;
    data:    Datum[];
}

export interface Datum {
    DORM_ID:     number;
    DORM_NAME:   string;
    ADDRESS:     string;
    SCORE:       string;
    image:       string;
    zone:        string;
    lat:         number;
    lng:         number;
    start_price: number;
}
