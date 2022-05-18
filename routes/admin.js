var express = require('express');
const { status } = require('express/lib/response');
const async = require('hbs/lib/async');

const { getAllProducts } = require('../helpers/product-helpers');
const productHelpers = require('../helpers/product-helpers');
var router = express.Router();
var productHelper=require('../helpers/product-helpers');
var userHelpers=require('../helpers/user-helpers')

const credential={
  email:process.env.ADMIN,
  password:process.env.PASSWORD
}

const verifyLogin=(req,res,next)=>{
  if(req.session.adminLoggedIn){
    next();
  }else{
    res.redirect('/admin/admin-login')
  }
}


/* GET base route. */
router.get('/',async(req, res, next)=> {
 let AllOrders=await productHelpers.totalOrders()
 let allUsers=await  productHelpers.totalUsers()
 let todaySales=await  productHelpers.dailySales()
 let totalProducts=await  productHelpers.totalProducts()
 let totalSales=await productHelper.getTotalIncome()

   res.render('admin/dashbord',{home:true,
    AllOrders,allUsers,totalProducts,todaySales,totalSales
  })
  })
  



router.get('/admin-login',(req,res)=>{
  if(req.session.adminLoggedIn){
    admin=req.session.adminLoggedIn=true;
    res.redirect('/admin/dashbord')
  }else{
    res.render('admin/admin-login',{home:true})
  } 
})

router.post('/admin-login',(req,res)=>{
  if(req.body.Email==credential.email&&req.body.Password==credential.password){
    user=req.session.adminLoggedIn=true;
    req.session.admin=req.body.Email
    res.redirect('/admin')
  }else{
    res.render('admin/admin-login',{msg:"Login failed"})
  }
})
     //  product section

router.get('/view-products',(req,res)=>{
  productHelpers.getAllProducts().then((products)=>{
  res.render('admin/view-products',{admin:true,products})
})
})


router.get('/add-product',verifyLogin,(req,res)=>{
  productHelpers.getAllcategory().then((category)=>{
    res.render('admin/add-product', {admin:true,category})
  })
 
})
router.post('/add-product',verifyLogin,(req,res)=>{

  productHelpers.addProduct(req.body,(result)=>{
    let image=req.files.Image
    let image1=req.files.Image1
    let image2=req.files.Image2
   
     image.mv('./public/product-images/'+result+'.jpg',(err,done)=>{
      image1.mv('./public/product-images1/'+result+'.jpg')  
      image2.mv('./public/product-images2/'+result+'.jpg')
      
      if(!err){
        res.redirect("/admin/view-products")
      }
    })
    
  })

})

router.get('/delete-product/:id',verifyLogin,(req,res)=>{
    let proId=req.params.id
    productHelpers.deleteProduct(proId).then((response)=>{
      res.redirect('/admin/view-products')
    })
})

router.get('/edit-product/:id',verifyLogin,async(req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  res.render('admin/edit-product',{product,admin:true})
})



router.post('/edit-product/:id', verifyLogin, (req, res) => {
  let id = req.params.id
  console.log("req.body", req.body);
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin/view-products')
    
    if (req.files?.Image && req.files?.Image1&& req.files?.Image2) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
      let image1 = req.files.Image1
      image1.mv('./public/product-images1/' + id + '.jpg')
      let image2= req.files.Image2
      image2.mv('./public/product-images2/' + id + '.jpg')
    }

    else if (req.files?.Image && req.files?.Image1) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
      let image1 = req.files.Image1
      image1.mv('./public/product-images1/' + id + '.jpg')
    }

    else if (req.files?.Image && req.files?.Image2) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')
      let image2 = req.files.Image2
      image2.mv('./public/product-images2/' + id + '.jpg')
    }
    else if (req.files?.Image2 && req.files?.Image1) {
      let image2 = req.files.Image2
      image2.mv('./public/product-images2/' + id + '.jpg')
      let image1 = req.files.Image1
      image1.mv('./public/product-images1/' + id + '.jpg')
    }
    else if (req.files?.Image2) {
      let image2 = req.files.Image2
      image2.mv('./public/product-images2/' + id + '.jpg')

    }
    else if (req.files?.Image1) {
      let image1 = req.files.Image1
      image1.mv('./public/product-images1/' + id + '.jpg')

    }
    else if (req.files?.Image) {
      let image = req.files.Image
      image.mv('./public/product-images/' + id + '.jpg')

    }
  })
})

router.get('/view-user',verifyLogin,(req,res)=>{
  productHelpers.getAllusers().then((users)=>{
    res.render('admin/view-user',{admin:true,users,user})
  })
});

router.post('/block-user',verifyLogin,(req,res)=>{
 console.log("1236544");
  console.log(req.body.id);
  productHelpers.blockUser(req.body.id).then((response)=>{
    
     res.redirect('/admin/view-user')
  })
});

router.post('/unblock-user',verifyLogin,(req,res)=>{
  productHelpers.unblockUser(req.body.id).then((response)=>{
    res.redirect('/admin/view-user')
  })
})
router.get('/view-category',verifyLogin,(req,res)=>{
  productHelpers.getAllcategory().then((category)=>{
    console.log(category);
    res.render('admin/view-category',{category,admin:true})
  })
})
router.get('/add-category',verifyLogin,(req,res)=>{
  res.render('admin/add-category',{admin:true})
})
router.post('/add-category',verifyLogin,(req,res)=>{
  console.log(req.body);
  productHelpers.addcategory(req.body).then((result)=>{
    let image =req.files.Image

    image.mv('./public/category-images/'+result+'.jpg',(err,done)=>{
      if(!err){
        res.redirect('/admin/view-category')

      }else{
        console.log(err);
      }
    })
  })
})
router.get('/delete-category/:id',verifyLogin,(req,res)=>{
  let userId = req.params.id
  productHelpers.deletecategory(userId).then((response)=>{
    res.redirect('/admin/view-category')
  })
});
router.get('/edit-category/:id',verifyLogin,(req,res)=>{
  console.log(req.body.id);
   productHelpers.getcategorydetails(req.params.id).then((category)=>{
    res.render('admin/edit-category',{category})
  })
 
})
router.post("/edit-category/:id",verifyLogin,(req,res)=>{
  let id=req.params.id
  console.log(id);
  let image=req.files?.Image
  console.log(req.body);
  productHelpers.editcategory(id,req.body).then((response)=>{
    console.log("1234");
    res.redirect('/admin/view-category')
    if(image){
      image.mv('./public/category-images/'+id+'.jpg')
    }
  })

  }

)
router.get('/orders',verifyLogin,(req,res)=>{
  productHelper.getAllOrders().then((orders)=>{
    
    res.render('admin/orders',{orders,admin:true})
  })
  
})

router.get('/logout',(req,res)=>{
  req.session.admin=null
  req.session.adminLoggedIn=false
  res.redirect('/admin/admin-login')
})
router.get('/product-details/:id',async(req,res)=>{
 let products=await userHelpers.getOrderProducts(req.params.id)
 console.log(products);
  
res.render('admin/product-details',{products,admin:true})
})

router.post('/statusUpdate',verifyLogin,(req,res)=>{
  let status=req.body.status
  let orderId=req.body.orderId
  productHelpers.statusUpdate(status,orderId).then((response)=>{
   res.json(true)
  })
})
router.get('/offer-mgt',verifyLogin,async(req,res)=>{
 let allProducts=await productHelpers.getAllProducts()
  console.log(allProducts);
  let offerList=await productHelper.getOfferProducts()
  console.log("offerList:",offerList);
    res.render('admin/offer-mgt',{allProducts,offerList,admin:true}) 
})
router.post('/product-offer',verifyLogin,(req,res)=>{
  let data=req.body
  productHelpers.addProductOffer(data).then((resp)=>{
    res.redirect('/admin/offer-mgt')

  })
})
router.post('/delete-product-offer',verifyLogin,(req,res)=>{
   console.log('delete-offer');
  let proId=req.body.proId
  let offerId=req.body.offerId
  let originalPrice=req.body.origPrice
  productHelper.deleteProductOffer(proId,offerId,originalPrice)
  res.json({status:true})
})
router.get('/getChartDetails',async(req,res)=>{
  let dailyIncome=await productHelpers.getdailyincome()
  let yearlyIncome=await productHelpers.getYearlyIncome()
  res.json({dailyIncome,yearlyIncome})
  // console.log(yearlyIncome);

})
router.get('/add-coupon',async(req,res)=>{
  let AllCoupons=await productHelpers.getAllCoupons()
  res.render('admin/add-coupon',{admin:true,AllCoupons})
})
router.post('/add-coupon',verifyLogin,(req,res)=>{
  let data=req.body
  productHelpers.addCoupon(data).then((resp)=>{
    res.redirect('/admin/add-coupon')
  })
})



router.get('/category-offer',verifyLogin, async(req,res)=>{
  let category=await productHelpers.getAllcategory()
  let categoryOffers=await productHelpers.getAllCatOffer()
  console.log('category:',category);
  res.render('admin/category-offer',{category,categoryOffers,admin:true})
})
router.post('/category-offer',verifyLogin, async(req,res)=>{
  let body=req.body
  console.log(body);
  let data=await productHelpers.addCategoryOffer(body).then((resp)=>{
    console.log("anitha",resp);
    res.redirect('/admin/category-offer')
  })
 
})
router.post('/delete-category-offer',verifyLogin, (req,res)=>{
  offerId=req.body
  console.log("offerId",offerId);
  productHelpers.deleteCategoryOffer(offerId)
})
router.get("/reports",verifyLogin,(req,res)=>{
  productHelpers.monthlyReport().then((data)=>{
    console.log("rep data",data);
    res.render("admin/reports",{admin:true,data})
  }) 
  })
  
  
  router.post("/report",verifyLogin,(req,res)=>{
    productHelpers.salesReport(req.body).then((data)=>{
      console.log("rep.... data",data);
      res.render("admin/reports",{admin:true,data})
    })
  })
  router.post("/delete-coupon",verifyLogin,(req,res)=>{
    couponId=req.body.couponId,
    console.log("coup",couponId);
    productHelpers.deleteCoupon(couponId).then((result)=>{
      console.log("re",result);
      res.json(result)
    })
    
  })


module.exports = router;
