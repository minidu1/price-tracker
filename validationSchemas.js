export const createUserValidation = {
  name: {
    isString: {
      errorMessage: "Name must be a string",
    },
    trim: true,
    notEmpty: {
      errorMessage: "Name must not be empty",
    },
    isLength: {
      options: {
        min: 3,
        max: 32,
      },
      errorMessage:
        "Name must be at least 3 characters and at most 32 characterss",
    },
    escape: true,
  },
  password:{
    trim:true,
    notEmpty:{
      errorMessage: "Password must not be empty"
    },
    isLength:{
      options:{
        min:6
      },
      errorMessage:"Password must be at least 6 characters"
    },
  },
  email:{
    trim:true,
    isEmail:{
      errorMessage: "Must be a valid e-mail address"
    }
  }
};
