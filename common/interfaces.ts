export interface ReadCallbackReply {
  error?: string;
  contents?: string;
}

export interface Callbacks {
  import (path: string): ReadCallbackReply;
}
