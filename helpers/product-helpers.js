var db = require('../config/connection')
var collection = require('../config/collections')
const promise = require('promise')
const res = require('express/lib/response')
const async = require('hbs/lib/async')
const moment = require('moment')
const { resolve, reject } = require('promise')
var objectId = require('mongodb').ObjectId
module.exports = {
    addProduct: (product, callback) => {

        db.get().collection('product').insertOne(product).then((data) => {
            callback(data.insertedId)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()    
            resolve(products)
        })
    },
    deleteProduct: (prodId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).remove({ _id: objectId(prodId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                $set: {
                    Name: proDetails.Name,
                    Category: proDetails.Category,
                    Price: proDetails.Price,
                    Description: proDetails.Description

                }
            }).then((response) => {
                resolve()
            })
        })
    },
    getAllusers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            resolve(users)
        })
    },

    getuserDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }).then((user) => {
                resolve(user)
            })
        })
    },
    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            console.log(userId);
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    blocked: true
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },

    unblockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set: {
                    blocked: false
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    getAllcategory: () => {
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray()
            resolve(category)
        })
    },
    addcategory: (category) => {
        return new Promise((resolve, reject) => {
            db.get().collection('category').insertOne(category).then((data) => {
                resolve(data.insertedId)

            })
        })

    }, deletecategory: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: objectId(catId) }).then((response) => {
                resolve(response)
            })
        })

    }, getcategorydetails: (catId) => {
        return new Promise((resolve, reject) => {
            let catdetail = db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(catId) })
            resolve(catdetail)
        })

    }, editcategory: (catId, catDetails) => {
        return new promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: objectId(catId) }, {
                $set: {
                    Category: catDetails.Category

                }
            }).then((response) => {
                resolve(response)


            })
        })
    }, getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            resolve(orders)

        })

    }, addProductOffer: (data) => {
        return new Promise(async (resolve, reject) => {
            data.discount = parseInt(data.discount)
            discount = parseInt(data.discount)
            data.startDate = new Date(data.startDate)
            data.expiryDate = new Date(data.expiryDate)
            console.log("data:", data);
            let offerExist = await db.get().collection(collection.PRODUCT_OFFER).findOne({ "data.offerProduct": data.offerProduct })

            if (offerExist) {
                await db.get().collection(collection.PRODUCT_OFFER).updateOne({ "data.offerProduct": data.offerProduct }, {
                    $set: {
                        "data.discount": data.discount,
                        "data.startDate": data.startDate,
                        "data.expiryDate": data.expiryDate,
                    }
                })
            }
            else {
                await db.get().collection(collection.PRODUCT_OFFER).insertOne({ data })
            }

            let products = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match: { Name: data.offerProduct }
                }
            ]).toArray()


            await products.map(async (product) => {
                let productPrice = product.Price
                productPrice = parseInt(productPrice)
                let discountPrice = productPrice - ((productPrice * discount) / 100)
                discountPrice = parseInt(discountPrice.toFixed(2))

                let proId = product._id
                await db.get().collection(collection.PRODUCT_COLLECTION).updateOne(
                    {
                        _id: proId,
                    },
                    {
                        $set: {
                            Price: discountPrice,
                            proOfferpercentage: discount,
                            prooff: true
                        }
                    })
            })
            resolve({ status: true })

        })



    }, getOfferProducts: () => {
        return new Promise(async (resolve, reject) => {
            let offerList = await db.get().collection(collection.PRODUCT_OFFER).aggregate([
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: "data.offerProduct",
                        foreignField: "Name",
                        as: "products"
                    }
                },
                {
                    $unwind: "$products"
                },
                {
                    $project: {
                        offerProduct: "$data.offerProduct",
                        discount: "$data.discount",
                        startDate: "$data.startDate",
                        expiryDate: "$data.expiryDate",
                        offerPrice: "$products.Price",
                        productPrice: "$products.originalPrice",
                        productId: "$products._id"
                    }
                }
            ]).toArray()
            console.log("offerlist", offerList);

            resolve(offerList)
        })
    }, deleteProductOffer: (prodId, offerProId, originalPrice) => {
        console.log("delete", prodId, offerProId, originalPrice);
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(prodId) },
                {
                    $set: {
                        Price: originalPrice,
                        prooff: false,
                        proOfferpercentage:""


                    }
                }
            ).then((response) => {
                console.log(response);
                db.get().collection(collection.PRODUCT_OFFER).deleteOne({ _id: objectId(offerProId) })

            })
            resolve()
        })

    }, totalOrders: () => {
        return new Promise(async (resolve, reject) => {
            let totalOrders = await db.get().collection(collection.ORDER_COLLECTION).count()
            resolve(totalOrders)
        })
    }, totalProducts: () => {
        return new Promise(async (resolve, reject) => {
            let totalProducts = db.get().collection(collection.PRODUCT_COLLECTION).count()
            resolve(totalProducts)
        })
    }, totalUsers: () => {
        return new Promise((resolve, reject) => {
            let totalUsers = db.get().collection(collection.USER_COLLECTION).count()
            resolve(totalUsers)
        })
    }, dailySales: () => {
        return new Promise(async (resolve, reject) => {
            let currentDate = new Date
            currentDate = currentDate.toISOString().split('T')[0]
            let todaySale = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "Delivered"
                    }
                }, {
                    $project: {
                        date: { $dateToString: { format: "%Y/%m/%d", date: "$dateIso" } }, totalAmount: 1
                    }
                }, {
                    $group: {
                        _id: "$date",
                        total: { $sum: "$totalAmount" }
                    }
                }
            ]).toArray()
            let data = 0
            todaySale.map(val => data = val.total)
            resolve(data)
        })

    }, getTotalIncome: () => {

        return new Promise(async (res, rej) => {
            let total = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "Delivered"
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$totalAmount" }
                    },
                }
            ]).toArray()
            console.log("t", total);

            res(total[0])

        })
    }, getdailyincome: () => {
        return new Promise(async (resolve, reject) => {
            dayIncome = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { status: "delivered" }
                }, {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$dateIso" } }, totalAmount: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                }, {
                    $sort: { _id: -1 }
                }, {
                    $limit: 7
                }
            ]).toArray()
             console.log("day",dayIncome)
            resolve(dayIncome)
        })
    }, getYearlyIncome: () => {
        return new Promise(async (resolve, reject) => {
            yearlyIncome = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { status: "delivered" }


                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y", date: "$dateIso" } }, totalAmount: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                }

            ]).toArray()
            console.log("yearly", yearlyIncome);
            resolve(yearlyIncome)
        })
    }, addCoupon: (data) => {
        return new Promise(async (resolve, reject) => {
            // let startDateIso = new Date(data.start)
             let endDateIso = new Date(data.expiry)
            let expiry = await moment(data.expiry).format('YYY-MM-DD')
            // let starting = await moment(data.start).format('YYYY-MM-DD')
            let dataobj = {
                coupon: data.coupon,
                discount: parseInt(data.discount),
                starting: starting,
                expiry: expiry,
                startDateIso: startDateIso,
                endDateIso: endDateIso,
                users: []

            }
            await db.get().collection(collection.COUPEN_COLLECTION).insertOne(dataobj).then((data) => {
                resolve()
            }).catch((err) => {
                res(err)
            })
        })

    }, getAllCoupons: () => {
        return new Promise(async (resolve, reject) => {
            let AllCoupons = await db.get().collection(collection.COUPEN_COLLECTION).find().toArray()
            resolve(AllCoupons)
            console.log("ameen", AllCoupons);
        })
    },
    addCategoryOffer: (data) => {
        console.log("ggg", data);

        return new Promise(async (resolve, reject) => {
            data.startDateIso = new Date(data.startDate)
            data.endDate = new Date(data.expiryDate)
            discount = parseInt(data.discount)
            db.get().collection(collection.CATEGORY_OFFER).insertOne(data).then((response) => {
                resolve(response)
                console.log("adc", response);
            })


        })



    },

    getAllCatOffer: () => {
        return new Promise(async (resolve, reject) => {
            let catgoryOffer = await db.get().collection(collection.CATEGORY_OFFER).find().toArray()
            resolve(catgoryOffer)
        })
    },
    startCategoryOffer: (date) => {
        let catStartDateIso = new Date(date);
        console.log('this is a category offer.................... ', date);
        return new Promise(async (res, rej) => {
            let data = await db.get().collection(collection.CATEGORY_OFFER).find({ startDateIso: { $lte: catStartDateIso } }).toArray();
            if (data.length > 0) {
                await data.map(async (onedata) => {
                    console.log("da", data);



                    let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ Category: onedata.offerProduct, offer:{ $exists: false },offer: false ,prooff:{ $exists:false},prooff:false}).toArray();
                    console.log("pro", products);
                    console.log("one", onedata);

                    await products.map(async (product) => {
                        let actualPrice = product.originalPrice
                        console.log("propri", product.Price);
                        let newPrice = (((product.Price) * (onedata.discount)) / 100)
                        newPrice = newPrice.toFixed()
                        console.log("hhh", actualPrice, newPrice, onedata.discount);
                        db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(product._id) },
                            {
                                $set: {
                                    actualPrice: actualPrice,
                                    Price: (actualPrice - newPrice),
                                    offer: true,
                                    catOfferPercentage: onedata.discount
                                }
                            })
                    })
                })
                res();
            } else {
                res()
            }

        })

    },
    monthlyReport: () => {
        return new Promise(async(res, rej) => {
          let today = new Date()
          let end = moment(today).format('YYYY/MM/DD')
          let start = moment(end).subtract(30, 'days').format('YYYY/MM/DD')
          console.log(end,start);
          let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $ne: 'Cancel' } }).toArray()
          console.log("order success",orderSuccess);
          let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
         console.log(orderTotal);
          let orderSuccessLength = orderSuccess.length
          let orderTotalLength = orderTotal.length
          let orderFailLength = orderTotalLength - orderSuccessLength
          let total = 0;
          let paypal = 0;
          let razorpay = 0;
          let cod = 0;
          for (let i = 0; i < orderSuccessLength; i++) {
            total = total + orderSuccess[i].totalAmount;
            if(orderSuccess[i].paymentmethod=='PAYPAL'){
              paypal++;
          }else if(orderSuccess[i].paymentmethod=='ONLINE'){
              razorpay++;
          }else if(orderSuccess[i].paymentmethod=='COD'){
              cod++;
          }
          }
          var data = {
            start: start,
            end: end,
            totalOrders: orderTotalLength,
            successOrders: orderSuccessLength,
            failedOrders: orderFailLength,
            totalSales: total,
            cod: cod,
            paypal: paypal,
            razorpay: razorpay,
            currentOrders: orderSuccess
          }
          // console.log(data);
          res(data)
        })
      },salesReport:(date)=>{
        return new Promise(async(res,rej)=>{
            
            let end= moment(date.EndDate).format('YYYY/MM/DD')
            let start=moment(date.StartDate).format('YYYY/MM/DD')
      
            let orderSuccess= await db.get().collection(collection.ORDER_COLLECTION).find({date:{$gte:start,$lte:end},status:{ $ne: 'Cancelled' }}).toArray()
            let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({date:{$gte:start,$lte:end}}).toArray()
            console.log("orderSuccess",orderSuccess,orderTotal);
            let orderSuccessLength = orderSuccess.length
            let orderTotalLength = orderTotal.length
            let orderFailLength = orderTotalLength - orderSuccessLength
            let total=0;
            let paypal=0;
            let razorpay=0;
            let cod=0;
            for(let i=0;i<orderSuccessLength;i++){
                total=total+orderSuccess[i].totalAmount;
                if(orderSuccess[i].paymentmethod=='PAYPAL'){
                    paypal++;
                }else if(orderSuccess[i].paymentmethod=='ONLINE'){
                    razorpay++;
                }else{
                    cod++;
      
                }
            }
            var data = {
               start: start,
               end: end,
               totalOrders: orderTotalLength,
               successOrders: orderSuccessLength,
               failedOrders: orderFailLength,
               totalSales: total,
               cod: cod,
               paypal: paypal,
               razorpay: razorpay,
               currentOrders: orderSuccess
           }
       res(data)
       })
      
      },deleteCoupon:(couponId)=>{
        console.log("xx",couponId);
          return new Promise((resolve,reject)=>{
              db.get().collection(collection.COUPEN_COLLECTION).deleteOne({_id:objectId(couponId)}).then((response)=>{
                  resolve({status:true})
              })
          })
      },
   
    statusUpdate: (status, orderId) => {
        return new Promise((resolve, reject) => {
            console.log(status,orderId);
            if (status == "delivered") {
                console.log('sidheek');
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                    $set: {
                        status: status,
                        cancelled: false,
                        Delivered: true
                    }

                })
            }
            else if (status == "cancelled") {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                    $set: {
                        status: status,
                        Cancelled: true,
                        Delivered: false
                    }

                })
            } else {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
                    $set: {
                        status: status,




                    }
                }).then((response) => {
                    console.log("response",response);
                    resolve(true)
                })

            }

        })
    },
      
      deleteCategoryOffer: (id) => {
        console.log(id.offerId);
        return new Promise(async (res, rej) => {
            console.log("priiii");
          let categoryOffer = await db.get().collection(collection.CATEGORY_OFFER).findOne({ _id:objectId(id.offerId) })
          let catName = categoryOffer.offerProduct
          console.log("cat",categoryOffer);
          console.log("nam",catName);
          let product = await db.get().collection(collection.PRODUCT_COLLECTION).find({ Category: catName }, { offer: { $exists: true } }).toArray()
          if (product) {
            db.get().collection(collection.CATEGORY_OFFER).deleteOne({ _id: objectId(id.offerId) }).then(async () => {
              await product.map((product) => {
                console.log("pro",product);
                db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(product._id) }, {
                  $set: {
                    Price: product.originalPrice
                  },
                  $unset: {
                    offer: "",
                    catOfferPercentage: '',
                    actualPrice: ''
                  }
                }).then(() => {
                  res()
                })
              })
            })
          } else {
            res()
          }
    
        })
    
      },
    }