
        function addToCart(proId){
            $.ajax({
                url:'/add-to-cart/'+proId,
                method:'get',
                success:(response)=>{
                    if(response.status){
                        let count=$('#cart-count').html()
                        count=parseInt(count)+1
                        $("#cart-count").html(count)
                        Swal.fire({
                            position: 'center',
                            icon: 'success',
                            title: 'product added to Cart',
                            showConfirmButton: false,
                            timer: 1500
                          })
                    }else{
                        location.href='/login'
                    }
                    
                }
            })
        }
        
 