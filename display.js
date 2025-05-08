document.addEventListener("DOMContentLoaded", async () => {
    const productList = document.getElementById("product-list");

    // Get the token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You are not logged in. Please log in first.');
        return;
    }

    try {
        // Fetch products with the Authorization header
        const response = await fetch("http://localhost:3000/get-products", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`  // Include token in header
            }
        });
        const products = await response.json();

        if (products.length === 0) {
            productList.innerHTML = "<p>No products available.</p>";
            return;
        }

        products.forEach(async (product) => {
            const productCard = document.createElement("div");
            productCard.classList.add("product-card");

            // Fetch the image for the product
            const imageResponse = await fetch(`http://localhost:3000/image/${product.id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`  // Include token for image
                }
            });

            if (imageResponse.ok) {
                const imageBlob = await imageResponse.blob();
                const imageURL = URL.createObjectURL(imageBlob);  // Convert the image to a URL

                productCard.innerHTML = `
                    <img src="${imageURL}" alt="${product.product_name}" class="product-image">
                    <h3>${product.product_name}</h3>
                    <p>Category: ${product.category}</p>
                    <p>Price: RM ${product.price}</p>
                    <p>${product.description}</p>
                    <p>${product.ucontact}</p>
                    <button class="delete-btn" data-id="${product.id}">Delete</button>
                `;
                productList.appendChild(productCard);
            } else {
                console.error(`Error fetching image for product ${product.id}`);
            }
        });

        // Add event listener to all delete buttons
        document.querySelectorAll(".delete-btn").forEach(button => {
            button.addEventListener("click", async function () {
                const productId = this.getAttribute("data-id");

                const confirmDelete = confirm("Are you sure you want to delete this product?");
                if (!confirmDelete) return;

                try {
                    // Send DELETE request with token
                    const deleteResponse = await fetch(`http://localhost:3000/delete-product/${productId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`  // Include token for delete
                        }
                    });

                    const result = await deleteResponse.json();

                    if (result.success) {
                        alert("Product deleted successfully");
                        this.parentElement.remove(); // Remove product from UI
                    } else {
                        alert(result.error);
                    }
                } catch (error) {
                    console.error("Error deleting product:", error);
                }
            });
        });

    } catch (error) {
        console.error("Error fetching products:", error);
        productList.innerHTML = "<p>Error loading products.</p>";
    }
});
