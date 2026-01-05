import { FormControl } from '@angular/forms';

export interface UserUpdatePostReqForm {
  username: FormControl<string | null>;
  phone_number: FormControl<string | null>;
}
