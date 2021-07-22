export type SuccessErrorCallbacks<Ta, Tb> = {
    onSuccess: (arg: Ta) => any;
    onError: (arg: Tb) => any;
};
