import * as chai from "chai";
import {expect} from "chai";
import {Connection} from "../../src/connection/Connection";
import {TypeORM} from "../../src/TypeORM";
import {ConnectionOptions} from "../../src/connection/ConnectionOptions";
import {Repository} from "../../src/repository/Repository";
import {SchemaCreator} from "../../src/schema-creator/SchemaCreator";
import {PostDetails} from "../../sample/sample3-many-to-one/entity/PostDetails";
import {Post} from "../../sample/sample3-many-to-one/entity/Post";
import {PostCategory} from "../../sample/sample3-many-to-one/entity/PostCategory";
import {PostAuthor} from "../../sample/sample3-many-to-one/entity/PostAuthor";
import {PostMetadata} from "../../sample/sample3-many-to-one/entity/PostMetadata";
import {PostImage} from "../../sample/sample3-many-to-one/entity/PostImage";
import {PostInformation} from "../../sample/sample3-many-to-one/entity/PostInformation";

chai.should();
describe("many-to-one", function() {

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    let options: ConnectionOptions = {
        host: "192.168.99.100",
        port: 3306,
        username: "root",
        password: "admin",
        database: "test",
        autoSchemaCreate: true
    };
    
    // connect to db
    let connection: Connection;
    before(function() {
        return TypeORM.createMysqlConnection(options, [Post, PostDetails, PostCategory, PostMetadata, PostImage, PostInformation, PostAuthor]).then(conn => {
            connection = conn;
        }).catch(e => console.log("Error during connection to db: " + e));
    });

    after(function() {
        connection.close();
    });

    // clean up database before each test
    function reloadDatabase() {
        return connection.driver
            .clearDatabase()
            .then(() => new SchemaCreator(connection).create());
    }

    let postRepository: Repository<Post>,
        postDetailsRepository: Repository<PostDetails>,
        postCategoryRepository: Repository<PostCategory>,
        postImageRepository: Repository<PostImage>,
        postMetadataRepository: Repository<PostMetadata>;
    before(function() {
        postRepository = connection.getRepository<Post>(Post);
        postDetailsRepository = connection.getRepository<PostDetails>(PostDetails);
        postCategoryRepository = connection.getRepository<PostCategory>(PostCategory);
        postImageRepository = connection.getRepository<PostImage>(PostImage);
        postMetadataRepository = connection.getRepository<PostMetadata>(PostMetadata);
    });

    // -------------------------------------------------------------------------
    // Specifications
    // -------------------------------------------------------------------------

    describe("insert post and details (has inverse relation + full cascade options)", function() {
        let newPost: Post, details: PostDetails, savedPost: Post;
        
        before(reloadDatabase);

        before(function() {
            details = new PostDetails();
            details.authorName = "Umed";
            details.comment = "this is post";
            details.metadata = "post,posting,postman";
            
            newPost = new Post();
            newPost.text = "Hello post";
            newPost.title = "this is post title";
            newPost.details = details;
            return postRepository.persist(newPost).then(post => savedPost = post);
        });

        it("should return the same post instance after its created", function () {
            savedPost.should.be.equal(newPost);
        });

        it("should return the same post details instance after its created", function () {
            savedPost.details.should.be.equal(newPost.details);
        });

        it("should have a new generated id after post is created", function () {
            expect(savedPost.id).not.to.be.empty;
            expect(savedPost.details.id).not.to.be.empty;
        });

        it("should have inserted post in the database", function() {
            const expectedPost = new Post();
            expectedPost.id = savedPost.id;
            expectedPost.text = savedPost.text;
            expectedPost.title = savedPost.title;
            
            return postRepository.findById(savedPost.id).should.eventually.eql(expectedPost);
        });

        it("should have inserted post details in the database", function() {
            const expectedDetails = new PostDetails();
            expectedDetails.id = savedPost.details.id;
            expectedDetails.authorName = savedPost.details.authorName;
            expectedDetails.comment = savedPost.details.comment;
            expectedDetails.metadata = savedPost.details.metadata;
            
            return postDetailsRepository.findById(savedPost.details.id).should.eventually.eql(expectedDetails);
        });

        it("should load post and its details if left join used", function() {
            const expectedPost = new Post();
            expectedPost.id = savedPost.id;
            expectedPost.text = savedPost.text;
            expectedPost.title = savedPost.title;
            expectedPost.details = new PostDetails();
            expectedPost.details.id = savedPost.details.id;
            expectedPost.details.authorName = savedPost.details.authorName;
            expectedPost.details.comment = savedPost.details.comment;
            expectedPost.details.metadata = savedPost.details.metadata;
            
            return postRepository
                .createQueryBuilder("post")
                .leftJoinAndSelect("post.details", "details")
                .where("post.id=:id")
                .setParameter("id", savedPost.id)
                .getSingleResult()
                .should.eventually.eql(expectedPost);
        });

       /* it("should load details and its post if left join used (from reverse side)", function() {

            const expectedDetails = new PostDetails();
            expectedDetails.id = savedPost.details.id;
            expectedDetails.authorName = savedPost.details.authorName;
            expectedDetails.comment = savedPost.details.comment;
            expectedDetails.metadata = savedPost.details.metadata;

            expectedDetails.post = new Post();
            expectedDetails.post.id = savedPost.id;
            expectedDetails.post.text = savedPost.text;
            expectedDetails.post.title = savedPost.title;
            
            return postDetailsRepository
                .createQueryBuilder("details")
                .leftJoinAndSelect("details.post", "post")
                .where("details.id=:id")
                .setParameter("id", savedPost.id)
                .getSingleResult()
                .should.eventually.eql(expectedDetails);
        });*/

        it("should load saved post without details if left joins are not specified", function() {
            const expectedPost = new Post();
            expectedPost.id = savedPost.id;
            expectedPost.text = savedPost.text;
            expectedPost.title = savedPost.title;
            
            return postRepository
                .createQueryBuilder("post")
                .where("post.id=:id", { id: savedPost.id })
                .getSingleResult()
                .should.eventually.eql(expectedPost);
        });

        it("should load saved post without details if left joins are not specified", function() {
            const expectedDetails = new PostDetails();
            expectedDetails.id = savedPost.details.id;
            expectedDetails.authorName = savedPost.details.authorName;
            expectedDetails.comment = savedPost.details.comment;
            expectedDetails.metadata = savedPost.details.metadata;
            
            return postDetailsRepository
                .createQueryBuilder("details")
                .where("details.id=:id", { id: savedPost.id })
                .getSingleResult()
                .should.eventually.eql(expectedDetails);
        });

    });

    describe("insert post and category (one-side relation)", function() {
        let newPost: Post, category: PostCategory, savedPost: Post;

        before(reloadDatabase);

        before(function() {
            category = new PostCategory();
            category.name = "technology";

            newPost = new Post();
            newPost.text = "Hello post";
            newPost.title = "this is post title";
            newPost.category = category;

            return postRepository.persist(newPost).then(post => savedPost = post);
        });

        it("should return the same post instance after its created", function () {
            savedPost.should.be.equal(newPost);
        });

        it("should return the same post category instance after its created", function () {
            savedPost.category.should.be.equal(newPost.category);
        });

        it("should have a new generated id after post is created", function () {
            expect(savedPost.id).not.to.be.empty;
            expect(savedPost.category.id).not.to.be.empty;
        });

        it("should have inserted post in the database", function() {
            const expectedPost = new Post();
            expectedPost.id = savedPost.id;
            expectedPost.text = savedPost.text;
            expectedPost.title = savedPost.title;
            return postRepository.findById(savedPost.id).should.eventually.eql(expectedPost);
        });

        it("should have inserted category in the database", function() {
            const expectedPost = new PostCategory();
            expectedPost.id = savedPost.category.id;
            expectedPost.name = "technology";
            return postCategoryRepository.findById(savedPost.category.id).should.eventually.eql(expectedPost);
        });

        it("should load post and its category if left join used", function() {
            const expectedPost = new Post();
            expectedPost.id = savedPost.id;
            expectedPost.title = savedPost.title;
            expectedPost.text = savedPost.text;
            expectedPost.category = new PostCategory();
            expectedPost.category.id = savedPost.category.id;
            expectedPost.category.name = savedPost.category.name;

            return postRepository
                .createQueryBuilder("post")
                .leftJoinAndSelect("post.category", "category")
                .where("post.id=:id", { id: savedPost.id })
                .getSingleResult()
                .should.eventually.eql(expectedPost);
        });

        it("should load details and its post if left join used (from reverse side)", function() {
            // later need to specify with what exception we reject it
            /*return postCategoryRepository
                .createQueryBuilder("category")
                .leftJoinAndSelect("category.post", "post")
                .where("category.id=:id", { id: savedPost.id })
                .getSingleResult()
                .should.be.rejectedWith(Error);*/ // not working, find fix
        });
        
    });

    describe("cascade updates should not be executed when cascadeUpdate option is not set", function() {
        let newPost: Post, details: PostDetails, savedPost: Post;

        before(reloadDatabase);

        before(function() {

            details = new PostDetails();
            details.authorName = "Umed";
            details.comment = "this is post";
            details.metadata = "post,posting,postman";

            newPost = new Post();
            newPost.text = "Hello post";
            newPost.title = "this is post title";
            newPost.details = details;

            return postRepository
                .persist(newPost)
                .then(post => savedPost = post);
        });

        it("should ignore updates in the model and do not update the db when entity is updated", function () {
            newPost.details.comment = "i am updated comment";
            return postRepository.persist(newPost).then(updatedPost => {
                updatedPost.details.comment.should.be.equal("i am updated comment");
                return postRepository
                    .createQueryBuilder("post")
                    .leftJoinAndSelect("post.details", "details")
                    .where("post.id=:id")
                    .setParameter("id", updatedPost.id)
                    .getSingleResult()
            }).then(updatedPostReloaded => {
                updatedPostReloaded.details.comment.should.be.equal("this is post");
            });
        }); // todo: also check that updates throw exception in strict cascades mode
    });

    describe("cascade remove should not be executed when cascadeRemove option is not set", function() {
        let newPost: Post, details: PostDetails, savedPost: Post;

        before(reloadDatabase);

        before(function() {

            details = new PostDetails();
            details.authorName = "Umed";
            details.comment = "this is post";
            details.metadata = "post,posting,postman";

            newPost = new Post();
            newPost.text = "Hello post";
            newPost.title = "this is post title";
            newPost.details = details;

            return postRepository
                .persist(newPost)
                .then(post => savedPost = post);
        });

        it("should ignore updates in the model and do not update the db when entity is updated", function () {
            newPost.details = null;
            return postRepository.persist(newPost).then(updatedPost => {
                return postRepository
                    .createQueryBuilder("post")
                    .leftJoinAndSelect("post.details", "details")
                    .where("post.id=:id")
                    .setParameter("id", updatedPost.id)
                    .getSingleResult()
            }).then(updatedPostReloaded => {
                updatedPostReloaded.details.comment.should.be.equal("this is post");
            });
        });
    });

    describe("cascade updates should be executed when cascadeUpdate option is set", function() {
        let newPost: Post, newImage: PostImage, savedImage: PostImage;

        before(reloadDatabase);

        it("should update a relation successfully when updated", function () {

            newImage = new PostImage();
            newImage.url = "logo.png";

            newPost = new Post();
            newPost.text = "Hello post";
            newPost.title = "this is post title";

            return postImageRepository
                .persist(newImage)
                .then(image => {
                    savedImage = image;
                    newPost.image = image;
                    return postRepository.persist(newPost);

                }).then(post => {
                    newPost = post;
                    return postRepository
                        .createQueryBuilder("post")
                        .leftJoinAndSelect("post.image", "image")
                        .where("post.id=:id")
                        .setParameter("id", post.id)
                        .getSingleResult();

                }).then(loadedPost => {
                    loadedPost.image.url = "new-logo.png";
                    return postRepository.persist(loadedPost);

                }).then(() => {
                    return postRepository
                        .createQueryBuilder("post")
                        .leftJoinAndSelect("post.image", "image")
                        .where("post.id=:id")
                        .setParameter("id", newPost.id)
                        .getSingleResult();
                    
                }).then(reloadedPost => {
                    reloadedPost.image.url.should.be.equal("new-logo.png");
                });
        });

    });

    describe("cascade remove should be executed when cascadeRemove option is set", function() {
        let newPost: Post, newMetadata: PostMetadata, savedMetadata: PostMetadata;

        before(reloadDatabase);

        it("should remove a relation entity successfully when removed", function () {

            newMetadata = new PostMetadata();
            newMetadata.description = "this is post metadata";

            newPost = new Post();
            newPost.text = "Hello post";
            newPost.title = "this is post title";

            return postMetadataRepository
                .persist(newMetadata)
                .then(metadata => {
                    savedMetadata = metadata;
                    newPost.metadata = metadata;
                    return postRepository.persist(newPost);

                }).then(post => {
                    newPost = post;
                    return postRepository
                        .createQueryBuilder("post")
                        .leftJoinAndSelect("post.metadata", "metadata")
                        .where("post.id=:id")
                        .setParameter("id", post.id)
                        .getSingleResult();

                }).then(loadedPost => {
                    loadedPost.metadata = null;
                    return postRepository.persist(loadedPost);

                }).then(() => {
                    return postRepository
                        .createQueryBuilder("post")
                        .leftJoinAndSelect("post.metadata", "metadata")
                        .where("post.id=:id")
                        .setParameter("id", newPost.id)
                        .getSingleResult();

                }).then(reloadedPost => {
                    expect(reloadedPost.metadata).to.be.empty;
                });
        });

    });

});