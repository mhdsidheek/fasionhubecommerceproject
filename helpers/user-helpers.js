var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
const async = require('hbs/lib/async')
const { resolve, reject } = require('promise')
const moment=require('moment')
var objectId=require('mongodb').ObjectId





const Razorpay = require('razorpay');

var instance =  new Razorpay({
  key_id: 'rzp_test_euHFQ8RugylN9C',
  key_secret: 'mHcPwNdEB5uUMjxQuLREvkGv',
});





module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            
            
            userData.Password=await bcrypt.hash(userData.Password,10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
               resolve(data.insertedId)
            
            })
            if(userData.referedBy!=''){
                console.log("refer",userData.referedBy);
                db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userData.referedBy)},{$inc:{wallet:100}})
            } 
        
        })
        
    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus=false;
            
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            
            if(user){
                
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        response.blocked=user.blocked
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        resolve({status:false})
                    }
                })
            }else{
                
                resolve({status:false})
            }
        })
    }, 
     emailcheck:(email,phone)=>{
        console.log(email);
        return new Promise(async(resolve,reject)=>{
          let user=await db.get().collection(collection.USER_COLLECTION).findOne({$or:[{Email:email},{number:phone}]})
          console.log(user);
          resolve(user)

        })

        },
        mobilecheck:(phone)=>{
            return new Promise(async(resolve,reject)=>{
                let tuser=await db.get().collection(collection.USER_COLLECTION).findOne({number:phone})
                resolve(tuser)
            })

        },
        addToCart:(proId,userId)=>{
            let proObj={
                item:objectId(proId),
                quantity:1
            }
            console.log(proId);
            console.log(userId);
            return new Promise(async(resolve,reject)=>{
                let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
                if(userCart){
                    let proExist=userCart.products.findIndex(product=>product.item==proId)
                    console.log("pro");
                    console.log(proExist);
                    if(proExist!=-1){
                        db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
                        {
                            $inc:{'products.$.quantity':1}
                        }
                        ).then(()=>{
                            resolve()
                        })


                    }else{
                    
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId)},
                    {
                     
                   $push:{products:proObj}
                    }
                    ).then((response)=>{
                        console.log(response)
                        resolve(response)
                    })
                }
                   
                   


                }else{
                    let cartObj={
                        user:objectId(userId),
                        products:[proObj]

                    }
                    db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                        resolve()
                    })
                }
            })

        },getCartProducts:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                    $match:{user:objectId(userId)}
                    },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:{
                            item:'$products.item',
                            quantity:'$products.quantity'
                        }
                    },
                    {
                        $lookup:{
                            from:collection.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'

                        }
                    },{
                        $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        }
                    }
                    
                ]).toArray()
                // console.log(cartItems);
                resolve(cartItems)
            })
        },getCartCount:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let count=0
                let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
                if(cart){
                    count=cart.products.length

                }
                resolve(count)
            })
        }, 
        changeProductQuantity:(details)=>{
           details.count=parseInt(details.count)
           details.quantity=parseInt(details.quantity)
            
            return new Promise((resolve,reject)=>{
                if(details.count==-1 && details.quantity==1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
                    {
                        $pull:{products:{item:objectId(details.product)}}
                    }
                    ).then((response)=>{
                        resolve({removeProduct:true})
                    })
                }else{

              

                
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id:objectId(details.cart),'products.item':objectId(details.product)},
                {
                    $inc:{'products.$.quantity':details.count}
                }
                ).then((response)=>{
                    resolve({status:true})
                })
            }
            })
         },
          
       
        getTotalAmount:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                    $match:{user:objectId(userId)}
                    },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:{
                            item:'$products.item',
                            quantity:'$products.quantity'
                        }
                    },
                    {
                        $lookup:{
                            from:collection.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'

                        }
                    },{
                        $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        }
                    },{
                        $group:{
                            _id:null,
                            total:{$sum:{$multiply:['$quantity',{$toInt:"$product.Price"}]}}
                        }
                    }
                    
                ]).toArray()
                
                resolve(total[0]?.total)
            })
            
        },placeOrder:(address,products,total,method,code,user)=>{
          
          console.log("ssssssssss",user);
          dateIso=new Date
          date=moment(new Date).format('YYYY/MM/DD')
          let time = moment(new Date).format('HH:mm:ss')
           
            return new Promise((resolve,reject)=>{
                console.log("12345", address,products,total,method,code,user);
                let status=method ==='COD'?'placed':'pending'
                let orderObj={
                    deliveryDetails:{
                        mobile:address.address.mobile,
                        address:address.address.address,
                        type:address.address.type,
                        pincode:address.address.pincode
                        
                    }, 
                    Name:user.Name,
                    userId:user._id,
                    paymentmethod:method,
                    products:products,
                    totalAmount:total,
                    status:status,
                    dateIso:dateIso,
                    date:date,
                    time:time
                }
                
                
                db.get().collection(collection.COUPEN_COLLECTION).updateOne({ coupon: code },
                    {
                        $push: {
                            users: user
                        }
                }).then(()=>{

                


                db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                    
                    console.log("inserted:",response);
                    resolve(response.insertedId)
                })
            })
            })

        },getCartProductList:(userId)=>{
            console.log(userId);
            return new Promise(async(resolve,reject)=>{
                let cart= await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            
                resolve(cart?.products)
                
            })

        },
        getUserOrders:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let orders =await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
                
                resolve(orders)
            })
        },
        getOrderProducts:(orderId)=>{
            return new Promise(async(resolve,reject)=>{
                let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {
                        $match:{_id:objectId(orderId)}
                    },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:{
                            item:'$products.item',
                            quantity:'$products.quantity'
                        }
                    },{
                        $lookup:{
                            from:collection.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'
                        }
                    },{
                        $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                        }
                    }

                ]).toArray()
                console.log(orderItems)
                resolve(orderItems)
            })
        },editUser:(userId,userDetails)=>{
            console.log("hi"+userId);
            console.log(userDetails)
            
           
            return new Promise((resolve,reject)=>{
               db.get().collection(collection.USER_COLLECTION).updateOne({Email:userDetails.Email},{
                    $set:{
                        Name:userDetails.Name,
                        Email:userDetails.Email,
                        number:userDetails.number 
                    }
                }).then((response)=>{
                    console.log(response)
                    resolve(response)
                })
            })
        },
        
        changePassword: (details) => {
            console.log("amal",details.userId);

            userId=details.userId
            
            return new Promise(async (resolve, reject) => {
                let user =await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(details.userId)
                
                })
                console.log("aju",user);
                if (user) {
                    bcrypt.compare(details.cpassword, user.Password).then(async(status) => {
                        if (status) {
                            details.nPassword = await bcrypt.hash(details.npassword,10)
                            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(details.userId) }, {
                                $set: {
                                    Password: details.nPassword
                                }
                            }).then((response) => {
                                if (response) {
                                    resolve({ status: true ,succPass:"Password changed"})
                                } else {
                                    console.log("error");
                                    resolve({ status: false, errorPass: "Password not updated" })
                                }
                            })
    
                        } else {
                            resolve({ status: false, errorPass: "Please enter the current Password properly" })
                        }
    
                    })
                }
            })
        
        },getProfile:(userId)=>{
            return new Promise((resolve,reject)=>{
                let profile=db.get().collection(collection.USER_COLLECTION).findOne({_id:objectId(userId)})
                resolve(profile)
            })
        },doLoginOtp:(phone)=>{
            return new Promise((resolve,reject)=>{
                let loginstatus=false;
                let response={};
                let user=db.get().collection(collection.USER_COLLECTION).findOne({number:phone})
                if(user){
                    response.blocked=user.blocked
                    response.user=user
                    response.status=true
                    resolve(response)
                }else{
                    resolve({status:false})
                }
            })
        },removeCart:(details)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart)},
                {
                    $pull:{products:{item:objectId(details.product)}

                    }
                }
                
                ).then((response)=>{
                    console.log("mk",response);
                    resolve({removeProduct:true})
                })
            })
          },
        
         
        
          getAddress:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let allAddress=await db.get().collection(collection.USER_COLLECTION).aggregate([
                    {
                        $match:{_id:objectId(userId)}
                            
                       
                    },{
                        $project:{address:1,_id:0}
                },{
                    $unwind:"$address"
                }
                ]).toArray()
                resolve(allAddress);
                console.log(allAddress);
            })
        },addAddress:(userId,data)=>{
            console.log(userId,data);
           let address={
               addressId:new objectId(),
               name:data.name,
               mobile:data.mobile,
               address:data.address,
               type:data.type,
               pincode:data.pincode
           }
           return new Promise((resolve,reject)=>{
               db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},
                {
                    $push:{address:address}
                }
               ).then((response)=>{
                resolve(response)
           })
           })
    
        },deleteAddress:(userId,addressId)=>{
            return new Promise((res,rej)=>{

            
            db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId),"address.addressId":objectId(addressId)},
            {
                $pull:{
                    address:{
                        "addressId":objectId(addressId)
                    }
                }
            }

            ).then((response)=>{
                console.log(response);
                res(response)
            })
        })
        },getOneAddress:(addressId,userId)=>{
            return new Promise((res,rej)=>{
               let oneAddress= db.get().collection(collection.USER_COLLECTION).aggregate([{
                    $match:{
                        _id:objectId(userId)
                    }
                },{
                    $unwind:"$address"
                },{
                    $match:{"address.addressId":objectId(addressId)}
                }
            ]).toArray()
            res(oneAddress)
            })
        },editAddress:(userId,addressId,data)=>{
            return new Promise(async(res,rej)=>{
                console.log("anu",data);
                console.log(addressId);
                console.log(userId);
             await db.get().collection(collection.USER_COLLECTION).updateOne({
                    _id:objectId(userId),
                    "address.addressId":objectId(addressId)
                },{
                    $set:{
                        "address.$.type":data.type,
                        "address.$.name":data.name,
                        "address.$.mobile":data.mobile,
                        "address.$.pincod":data.pincode,
                        "address.$.address":data.address

                    }
                }
                ).then((resp)=>{
                    console.log("anu" ,resp);
                    res(resp)
                })
            
            })
        }, generateRazorpay:(orderId,total)=>{
            console.log("raz:",orderId);
            return new Promise((resolve,reject)=>{
                var options={
                    amount:total*100,
                    currency:'INR',
                    receipt:""+orderId
                };
                instance.orders.create(options,function(err,order){
                    if(err){
                        console.log(err);
                    }else{
                    console.log("New  Order:",order);
                    resolve(order)
                }
                });
            })
        },
        verifyPayment:(details)=>{
            console.log("pay",details);
            return new Promise ((resolve,reject)=>{
            const crypto= require('crypto');
            let hmac=crypto.createHmac('sha256','mHcPwNdEB5uUMjxQuLREvkGv')
            hmac.update(details['payment[razorpay_order_id]']+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex')
            if(hmac=details['payment[razorpay_signature]']){
                resolve()
            }
            else{
                reject()
            }
            })

        },changePaymentStatus:(orderId)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
                {
                    $set:{
                        status:'placed'
                    }
                }
                ).then(()=>{
                    resolve()
            })
            })
        },couponValidate: (data, user) => {
            console.log("fffff",user);
            var da= data
            console.log("da",da);
            return new Promise(async(res,rej)=>{
                obj = {}
                    let date=new Date()
                    date=moment(date).format('YYYY-MM-DD')
                    let coupon= await db.get().collection(collection.COUPEN_COLLECTION).findOne({coupon:data.Coupon})
                    console.log("c",coupon);
                    if(coupon){
                        console.log("cou",coupon);
                        console.log("u",user);
                            let users = coupon.users
                            console.log("users",users);
                            let userChecker = users.includes(user)
                            console.log("chec",userChecker);
                            if(userChecker){
                                obj.couponUsed=true;
                                console.log("obj",obj);
                                res(obj)
                            }else{
                                if(date <= coupon.expiry){
                                    console.log("t",data);
                                    let total = parseInt(data.Total)
                                    let percentage = parseInt(coupon.discount)
                                    let discountVal = ((total * percentage) / 100).toFixed()
                                    obj.total = total - discountVal
                                    obj.success = true
                                    console.log("obj",obj)
                                    res(obj)
                                }else{
                                    obj.couponExpired = true
                                      console.log("Expired");
                                       res(obj)
                                }
                            }
                        }else{
                            obj.invalidCoupon = true
                            console.log("invalid");
                            res(obj)
    
                        }   
                 })
            },
              // Chech the referal Code
        checkReferal: (referal) => {
            return new Promise(async (res, rej) => {
              let refer = await db.get().collection(collection.USER_COLLECTION).find({ refer: referal }).toArray();
              if(refer){
                  res(refer)
              }else{
                  res(err)
              }
            });
          },
           // __________The wallet section started___________

           applayWallet:(val,userId)=>{
            let value=parseInt(val)
          return new Promise((res,rej)=>{
              db.get().collection(collection.USER_COLLECTION).updateOne({_id:objectId(userId)},{ $inc: { wallet: -value }}).then((response)=>{
                  res(response)
          })
          }) 
  
      },
      clearCart:(id)=>{
          console.log("clearcart",id);
          return new Promise((res,rej)=>{
            db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(id)}).then((response)=>{
                res(response)
            })
          })
       
      },
      categoryView:(cat)=>{
       return new Promise(async(res,rej)=>{
        let product=await db.get().collection(collection.PRODUCT_COLLECTION).find({Category:cat}).toArray()
        res(product)
       })
      },cancelOrder:(orderId)=>{
          return new Promise((resolve,reject)=>{
              db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId) },
                {
                    $set:{
                        status:"cancelled",
                        cancelled:true,
                        Delivered: false
                    }
                }
                ).then((response)=>{
                    resolve(true)
                })
          })
      }

     
 }
