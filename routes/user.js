const { response } = require('express');
var express = require('express');
const res = require('express/lib/response');
const async = require('hbs/lib/async');
const { Db } = require('mongodb');
const createReferal=require("referral-code-generator")
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers=require('../helpers/user-helpers')
const SERVICESID=process.env.SERVICESID
const ACCOUNTSID=process.env.ACCOUNTSID
const AUTHTOKEN=process.env.AUTHTOKEN
const client=require('twilio')(ACCOUNTSID,AUTHTOKEN)
const paypal = require('paypal-rest-sdk');
require('dotenv').config();
 
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': process.env.CLIENTID,
  'client_secret': process.env.CLIENTSECREAT
});
const verifyLogin=(req,res,next)=>{
  if(req.session.user){
    next()
  }else{   
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  let todayDate=new Date().toISOString().slice(0,10)
  console.log(todayDate);
  let user=req.session.user
  let cartCount=null
  
  if(req.session.user){
   cartCount= await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products)=>{
    productHelpers.getAllcategory().then((category)=>{
    let  productOff=productHelpers.getOfferProducts().then((offerList)=>{
 let catoff= productHelpers.startCategoryOffer(todayDate).then(()=>{
  
    res.render('user/view-products',{products,user,category,cartCount,catoff,productOff})
  })
})
})
});
})

router.get('/login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{

    res.render('user/login',{"loginErr":req.session.userLoginErr})
    req.session.userLoginErr=false
  }
  
})

router.get('/signup',async(req,res)=>{
  let refer = (await req.query.refer) ? req.query.refer : null;
  res.render('user/signup', { refer })
  res.render('user/signup')
})

router.post('/signup',(req,res)=>{
  let email=req.body.Email
  let phone=req.body.number
  let refer = createReferal.alphaNumeric("uppercase", 2, 3);
  req.body.refer = refer;
  if (req.body.referedBy != "") {
    userHelpers
      .checkReferal(req.body.referedBy)
      .then((data) => {
        req.body.referedBy = data[0]._id;
        req.body.wallet = 100;
        userHelpers.emailcheck(email,phone).then((response)=>{
      
          if(response){
            res.render('user/signup',{error:"invalid mobilenumber or email"})
            error=false;
          }else{
            userHelpers.doSignup(req.body).then((response)=>{
           console.log(email);
         
         console.log(response);
         req.session.user=response.user
         req.session.loggedIn=true 
         
         res.redirect('/')
          
       })
     }
     
     })
      })
      .catch(() => {
        req.session.referErr = "Sorry No such Code Exists";
        res.redirect("/signup");
      });
  } else {
  

    userHelpers.emailcheck(email,phone).then((response)=>{
      
     if(response){
       res.render('user/signup',{error:"invalid mobilenumber or email"})
       error=false;
     }else{
       userHelpers.doSignup(req.body).then((response)=>{
      console.log(email);
    
    console.log(response);
    req.session.user=response.user
    req.session.loggedIn=true 
    
    res.redirect('/')
     
  })
}

})
  }
})

router.post('/login',(req,res)=>{
  console.log(req.body);
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      if(!response.blocked){
        req.session.user=response.user
      req.session.user.loggedIn=true
      res.redirect('/')

      }else{
        req.session.userLoginErr="sorry your account is blocked"
        res.redirect('/login')
        
      }
      
    }else{
       req.session.userLoginErr="invalid user name or password"
      res.redirect('/login')
    }
  })
})

router.get('/logout',((req,res)=>{
  req.session.user=null
  res.redirect('/')
}))

router.get('/cart',verifyLogin,async(req,res)=>{
  let products=await userHelpers.getCartProducts(req.session?.user._id)
  
    let totalValue=await userHelpers.getTotalAmount(req.session?.user._id)
  
 
  // console.log(products);
res.render('user/cart',{products,user:req.session.user,totalValue})
})
router.get('/add-to-cart/:id',(req,res)=>{
  console.log('api call')
  console.log(req.params.id);
  console.log("user",req.session.user._id);
  userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
    res.json({status:true})
  })
})
router.post('/change-product-quantity',(req,res,next)=>{
  console.log(req.body);
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userHelpers.getTotalAmount(req.body.user)
    console.log(response);
    res.json(response)

  })
})
router.post('/remove-cart-product',(req,res,next)=>{
  console.log(req.body)
 userHelpers.removeCart(req.body).then((response)=>{
   console.log("json", response);
    res.json(response)
  })
})
router.get('/otp-login',(req,res)=>{
  res.render('user/otp-login')
})

router.post('/otp-login',(req,res)=>{
  console.log(req.body);

  var phone=req.body.number;
  userHelpers.mobilecheck(phone).then((tuser)=>{
    console.log(tuser);
 if(tuser){
  client.verify.services(SERVICESID)
  .verifications.create({
    to:`+91${req.body.number}`,
    
    channel:"sms",
}).then((resp)=>{
  otpPhone=phone
  res.render('user/otp',{otpPhone})

})
}else{
  
  res.render('user/otp-login',{otperror:true})
 }
})
    
})
router.post('/otp/:phone',(req,res)=>{
 
  let phonenumber=req.params.phone
let otp=req.body.otp
console.log(phonenumber);
  console.log("otp :",otp);
  client.verify.services(SERVICESID).verificationChecks.create({
    to:`+91${phonenumber}`,
    code:otp
  })
 .then((resp)=>{
    console.log(resp);
    const user=resp.valid;
    if(user){
      userHelpers.doLoginOtp(phonenumber).then((response)=>{
        if(response.status){
          if(!response.blocked){
            req.session.user=response.user
            req.session.user.loggedIn=true
            res.redirect('/')
          }
        }
      })
      

    }else{
      res.render('user/otp',{checkotp:true})

    }

   
  })
})
router.get('/product-details/:id',async(req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('user/product-details' ,{product})
})
router.get('/place-order',verifyLogin,async(req,res)=>{
 
  let total=await userHelpers.getTotalAmount(req.session.user._id)
  let address=await userHelpers.getAddress(req.session.user._id)
 let user1=await productHelpers.getuserDetails(req.session.user._id)
  console.log("add",address);
  res.render('user/place-order',{total,user:req.session.user,address,user1})
})
router.get('/check-out',async(req,res)=>{
  console.log("/place-order called rout");
  console.log(req.session.user._id);
  let userId=req.session.user._id
  console.log(userId);
  if(req.session.couponTotal || req.session.walletTotal){
    if(req.session.couponTotal){
    console.log("req",req.session.couponTotal);
    var totalPrice = req.session.couponTotal
    }if(req.session.walletTotal){
      var totalPrice=req.session.walletTotal

    }

  }
  else{
    totalPrice=await userHelpers.getTotalAmount(req.session.user._id)
  }
  
  console.log("to",totalPrice);
  let products=await userHelpers.getCartProductList(userId)
  console.log("productssssss",products);
  let address=await userHelpers.getOneAddress(req.query.addressId,req.session.user._id)
  user= await productHelpers.getuserDetails(userId)
  payment=req.query.payment
  
  
  console.log("userId",userId);
  userHelpers.placeOrder(address[0],products,totalPrice,payment,req.query.coupo,user).then((orderId)=>{
   
    console.log("co",req.query.coupo);
    console.log(userId);
    
   
    if(payment==='COD'){
      userHelpers.clearCart(user._id).then(()=>{
         res.json({codSuccess:true})
    })
    }else if(payment=="PAYPAL"){
      val = totalPrice /74
      totalPrice = val.toFixed(2)
      let totals = totalPrice.toString()
      req.session.total = totals;
      console.log(totals);
        
      const create_payment_json = {
        "intent": "sale",
        "payer": {
            "payment_method": "paypal"
        },
        "redirect_urls": {
            "return_url": "http://localhost:3000/success",
            "cancel_url": "http://localhost:3000/orders"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": "Red Sox Hat",
                    "sku": "001",
                    "price": totals,
                    "currency": "USD",
                    "quantity": 1
                }]
            },
            "amount": {
                "currency": "USD",
                "total": totals
            },
            "description": "Hat for the best team ever"
        }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
          throw error;
      } else {
          console.log(payment);
          for(let i = 0;i < payment.links.length;i++){
            if(payment.links[i].rel === 'approval_url'){
              // res.redirect(payment.links[i].href);
              let link = payment.links[i].href;
              link = link.toString()
              res.json({ paypal: true, url: link })

            }
          }
      }
    });
 
    }
    else{
      console.log("call rezor pay",orderId,totalPrice);
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        console.log("last",response);
          res.json(response)
          
      })
    }
     
  })
  
})
router.get('/success',verifyLogin,(req,res)=>{
  userHelpers.clearCart(req.session.user._id).then(()=>{
    userHelpers.changePaymentStatus(req.session.orderId).then(()=>{
      res.render('user/order-success')
    })
  })
})
router.post('/verify-payment',(req,res)=>{
  console.log( 'payment body:',req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    console.log('pay');
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log('payment success');
      userHelpers.clearCart(req.session.user._id).then(()=>{
      res.json({status:true})
    })
  })
  }).catch((err)=>{
    res.json({status:false,errMsg:''})
  })
})
router.post('/add-order-address',(req,res)=>{
  userId=req.session.user._id
  data=req.body
  userHelpers.addAddress(userId,data).then((response)=>{
    res.redirect('/place-order')
  })
})
router.get('/order-success',(req,res)=>{
  res.render('user/order-success')
})

router.get('/orders',async(req,res)=>{
  let orders = await userHelpers.getUserOrders(req.session.user?._id)
  // console.log(orders);
  res.render('user/orders',{user:req.session.user,orders})
})
router.get('/view-order-products/:id',async(req,res)=>{
 let products=await userHelpers.getOrderProducts(req.params.id)
 
 res.render('user/view-order-products',{user:req.session.user,products})
})
router.get('/user-profile',async(req,res)=>{
 let user= await productHelpers.getuserDetails(req.session.user?._id)
let refer = req.session.user.refer;
  let referalLink = "localhost:3000/signup?refer=" + refer;
 console.log(user);
 
  res.render('user/user-profile',{user,referalLink})
})
router.get('/address',async(req,res)=>{
  let address=await userHelpers.getAddress(req.session.user?._id)
  res.render('user/address',{address,user:req.session.user} )
})
router.get('/add-address',(req,res)=>{
  res.render('user/add-address')

})
router.post('/add-address',(req,res)=>{

  data=req.body,
  userHelpers.addAddress(req.session.user._id,data).then((response)=>{
    console.log("sgwugdye",response);
    res.redirect('/address')

  })
})
router.get('/delete-address/:id',(req,res)=>{
  userId=req.session.user._id,
  addressId=req.params.id
  console.log("123654475",addressId)
  userHelpers.deleteAddress(userId,addressId).then((resp)=>{
    console.log(resp);
    res.redirect("/address")
  })
})
router.get('/edit-address/:id',(req,res)=>{
  addressId=req.params.id
  userId=req.session.user._id

  userHelpers.getOneAddress(addressId,userId).then((oneAddress)=>{
    console.log(oneAddress);
    res.render('user/edit-address',{oneAddress})
  })
 
})
router.post('/edit-address',(req,res)=>{
  userId=req.session.user._id
  addressId=req.body.addressId
  data=req.body
  
  userHelpers.editAddress(userId,addressId,data).then((resp)=>{
    console.log(resp);
    res.redirect('/address')
  })
})
router.get('/edit-profile/:id',async(req,res)=>{
  let userId=req.params.id
  console.log(userId);
  let user= await productHelpers.getuserDetails(userId)
  res.render('user/edit-user-profile',{user} )

})
router.post('/edit-user-profile',async(req,res)=>{
  console.log(req.body);
  console.log(req.body.Name);

 let userId=req.body.userId
  
  userHelpers.editUser(userId,req.body).then(()=>{
    
    res.redirect('/user-profile')
  })
})
   router.post('/change-password',(req,res)=>{
     userHelpers.changePassword(req.body).then((response)=>{
       console.log("sbshbdh" ,req.body);
       console.log(req.session._id);
       if(response){
         let profile=userHelpers.getProfile(req.session.user._id)
         let succMsg=response.succPass;
         res.render('user/user-profile',{succMsg,user:req.session.user,profile})
       }
     })
})
router.post('/cancel-order',(req,res)=>{
  orderId=req.body.orderId
  console.log(orderId,"anu");
   userHelpers.cancelOrder(orderId).then((response)=>{
     res.json(true)
   }) 
})

router.post("/couponApply",verifyLogin, (req, res) => {
  let id = req.session.user._id;
  userHelpers.couponValidate(req.body, id).then((response) => {
    console.log("resp",response);
    req.session.couponTotal = response.total;
    if (response.success) {
      res.json({ couponSuccess: true, total: response.total });
    } else if (response.couponUsed) {
      res.json({ couponUsed: true });
    } else if (response.couponExpired) {
      res.json({ couponExpired: true });
    } else {
      res.json({ invalidCoupon: true });
    }
  });
});


//applay the wallet into place-order page
router.post('/applayWallet', async (req, res) => {
  var user = req.session.user._id;
  let ttl = parseInt(req.body.Total);
  let walletAmount = parseInt(req.body.wallet);
  let userDetails = await productHelpers.getuserDetails(user);
  console.log(walletAmount);
  console.log(userDetails);
  if (userDetails.wallet >= walletAmount) {
    let total = ttl - walletAmount;
    userHelpers.applayWallet(walletAmount, user).then(() => {
      req.session.walletTotal = total;
      res.json({ walletSuccess: true, total });
    });
  } else {
    res.json({ valnotCurrect: true });
  }
});

router.get("/view-category/:id", async (req, res) => {
  let category = req.params.id
  let cartCount = await userHelpers.getCartCount(req.session?.user?._id)

  userHelpers.categoryView(category).then((products) => {
    console.log(products);
    res.render('user/view-category', { products, user: req.session.user,cartCount })
  })

})



module.exports = router;
