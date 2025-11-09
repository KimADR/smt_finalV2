const bcrypt=require("bcryptjs"); const hash=bcrypt.hashSync("ChangeMe123!", 10); console.log(hash);
