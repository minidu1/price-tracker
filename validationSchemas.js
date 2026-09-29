export const createUserValidation = {
  name: {
    isString: {
      errorMessage: "Name must be a string",
    },
    trim: true,
    notEmpty: {
      errorMessage: "Name is requiredy",
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
  password: {
    trim: true,
    notEmpty: {
      errorMessage: "Password is required",
    },
    isLength: {
      options: {
        min: 6,
      },
      errorMessage: "Password must be at least 6 characters",
    },
  },
  email: {
    trim: true,
    notEmpty: {
      errorMessage: "E-mail is required",
    },
    isEmail: {
      errorMessage: "Must be a valid e-mail address",
    },
  },
};

export const loginValidation = {
  password: {
    trim: true,
    notEmpty: {
      errorMessage: "Password is required",
    },
    isLength: {
      options: {
        min: 6,
      },
      errorMessage: "Password must be at least 6 characters",
    },
  },
  email: {
    trim: true,
    notEmpty: {
      errorMessage: "E-mail is required",
    },
    isEmail: {
      errorMessage: "Must be a valid e-mail address",
    },
  },
};

export const addNewProductValidation = {
  link: {
    trim: true,
    notEmpty: {
      errorMessage: "URL is required",
    },
    isURL: {
      errorMessage: "Please enter a valid url",
    },
    
  },
  target: {
    notEmpty: {
      errorMessage: "Target is required",
    },
    isFloat: {
      errorMessage: "Target must be a number",
      options: {
        min: 0,
      },
    },
  },
};
