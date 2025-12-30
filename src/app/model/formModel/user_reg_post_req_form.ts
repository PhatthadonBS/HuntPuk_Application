import { FormControl } from "@angular/forms";

export interface UserRegPostReqForm {
    username: FormControl<string>;
    email:    FormControl<string>;
    password: FormControl<string>;
    confirmPassword: FormControl<string>;
    phone:    FormControl<string>;
}
